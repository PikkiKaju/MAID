from __future__ import annotations

import json
import os
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from django.conf import settings
from django.db import close_old_connections
from django.utils import timezone

from network.models import TrainingJob, TrainingStatus, NetworkGraph
from network.services.builders import build_keras_model
from network.services.validators import validate_graph_payload


@dataclass
class TrainParams:
    x_columns: List[str]
    y_column: str
    optimizer: str = "adam"
    loss: str = "mse"
    metrics: List[str] | None = None
    epochs: int = 10
    batch_size: int = 32
    validation_split: float = 0.1
    test_split: float = 0.1

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TrainParams":
        return cls(
            x_columns=list(data.get("x_columns") or []),
            y_column=str(data.get("y_column")),
            optimizer=str(data.get("optimizer", "adam")),
            loss=str(data.get("loss", "mse")),
            metrics=list(data.get("metrics") or []),
            epochs=int(data.get("epochs", 10)),
            batch_size=int(data.get("batch_size", 32)),
            validation_split=float(data.get("validation_split", 0.1)),
            test_split=float(data.get("test_split", 0.1)),
        )


def _ensure_artifacts_dir() -> str:
    base = getattr(settings, "BASE_DIR", os.getcwd())
    out_dir = os.path.join(str(base), "artifacts")
    os.makedirs(out_dir, exist_ok=True)
    return out_dir


def _train_worker(job_id: str) -> None:
    """Background thread entry: trains a compiled Keras model and updates the job record.
    The job params include optimizer/loss/metrics and fit params.
    Dataset is expected at job.dataset_path.
    """
    # Make sure DB connections are not shared into the new thread
    close_old_connections()

    try:
        job = TrainingJob.objects.select_related("graph").get(id=job_id)
    except TrainingJob.DoesNotExist:
        return

    try:
        job.status = TrainingStatus.RUNNING
        job.progress = 0.01
        job.save(update_fields=["status", "progress", "updated_at"])

        # 1) Load graph payload
        graph: NetworkGraph = job.graph
        nodes = list(graph.nodes.order_by("created_at").values("id", "type", "label", "params", "position", "notes"))
        edges = list(graph.edges.order_by("created_at").values("id", "source_id", "target_id", "meta"))
        for e in edges:
            e.setdefault("source", e.get("source_id"))
            e.setdefault("target", e.get("target_id"))

        # 2) Validate and build keras model
        validate_graph_payload(nodes, edges)
        model = build_keras_model(
            structure=None,  # build_keras_model signature expects GraphStructure in older code; we rebuild from nodes/edges below
            nodes=[],
            edges=[],
        )  # We'll rebuild properly below if signature requires; see below

    except TypeError:
        # Build via current builders API: validate -> structure -> model
        from network.services.builders import build_graph_structure
        try:
            structure = build_graph_structure(nodes, edges)
            model = build_keras_model(structure, nodes, edges)
        except Exception as exc:  # rethrow to outer handler
            raise exc
    except Exception as exc:
        job.status = TrainingStatus.FAILED
        job.error = f"Model build failed: {exc}"
        job.save(update_fields=["status", "error", "updated_at"])
        return

    try:
        # 3) Compile model
        params = TrainParams.from_dict(job.params)
        from keras import optimizers, losses, metrics as kmetrics
        opt = optimizers.get(params.optimizer)
        los = losses.get(params.loss)
        mets = [kmetrics.get(m) for m in (params.metrics or [])] if params.metrics else []
        model.compile(optimizer=opt, loss=los, metrics=mets)

        job.progress = 0.05
        job.save(update_fields=["progress", "updated_at"])

        # 4) Load dataset
        if not job.dataset_path or not os.path.exists(job.dataset_path):
            raise FileNotFoundError("Uploaded dataset CSV file not found for job")

        df = pd.read_csv(job.dataset_path)
        x_cols = params.x_columns
        y_col = params.y_column
        if not x_cols or not y_col:
            raise ValueError("Missing x_columns or y_column in params")
        X = df[x_cols].to_numpy(dtype=np.float32)
        y = df[y_col].to_numpy()

        # 5) Train/val/test split (simple random split)
        rng = np.random.default_rng(seed=42)
        idx = np.arange(len(X))
        rng.shuffle(idx)
        n = len(idx)
        n_test = int(n * params.test_split)
        n_val = int(n * params.validation_split)
        n_train = n - n_test - n_val
        train_idx = idx[:n_train]
        val_idx = idx[n_train:n_train + n_val]
        test_idx = idx[n_train + n_val:]

        X_train, y_train = X[train_idx], y[train_idx]
        X_val, y_val = X[val_idx], y[val_idx]
        X_test, y_test = X[test_idx], y[test_idx]

        # 6) Fit
        history = model.fit(
            X_train,
            y_train,
            epochs=params.epochs,
            batch_size=params.batch_size,
            validation_data=(X_val, y_val) if len(X_val) > 0 else None,
            verbose=0,
        )

        job.progress = 0.95
        job.save(update_fields=["progress", "updated_at"])

        # 7) Evaluate
        eval_res = None
        if len(X_test) > 0:
            eval_res = model.evaluate(X_test, y_test, verbose=0)
            # Keras returns list if metrics set; map to names
            names = ["loss"] + [m.name if hasattr(m, "name") else str(m) for m in (mets or [])]
            if isinstance(eval_res, (list, tuple)):
                eval_res = {k: float(v) for k, v in zip(names, eval_res)}
            else:
                eval_res = {"loss": float(eval_res)}

        # 8) Save artifact
        out_dir = _ensure_artifacts_dir()
        artifact = os.path.join(out_dir, f"{job.id}.keras")
        try:
            model.save(artifact)
            job.artifact_path = artifact
        except Exception as exc:
            # Saving is optional in phase 1; continue even if save fails
            job.error = job.error + f"\nArtifact save warning: {exc}" if job.error else f"Artifact save warning: {exc}"

        # 9) Persist results
        job.result = {
            "history": {k: [float(x) for x in v] for k, v in (history.history or {}).items()},
            "evaluation": eval_res,
        }
        job.status = TrainingStatus.SUCCEEDED
        job.progress = 1.0
        job.save(update_fields=["status", "result", "artifact_path", "progress", "error", "updated_at"])

    except Exception as exc:
        job.status = TrainingStatus.FAILED
        job.error = f"Training failed: {exc}"
        job.save(update_fields=["status", "error", "updated_at"])


def launch_training_job(job: TrainingJob) -> None:
    """Starts a background thread to process the given job."""
    t = threading.Thread(target=_train_worker, args=(str(job.id),), daemon=True)
    t.start()
