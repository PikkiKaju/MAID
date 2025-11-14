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
    y_one_hot: bool = False
    learning_rate: float | None = None
    shuffle: bool = True
    validation_batch_size: int | None = None
    # EarlyStopping
    early_stopping: bool = False
    es_monitor: str = "val_loss"
    es_mode: str = "auto"
    es_patience: int = 5
    es_min_delta: float = 0.0
    es_restore_best_weights: bool = True
    # ReduceLROnPlateau
    reduce_lr: bool = False
    rlrop_monitor: str = "val_loss"
    rlrop_factor: float = 0.1
    rlrop_patience: int = 3
    rlrop_min_lr: float = 1e-6

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
            y_one_hot=bool(str(data.get("y_one_hot", "false")).lower() in {"1", "true", "yes", "on"}),
            learning_rate=(float(data["learning_rate"]) if data.get("learning_rate") not in (None, "") else None),
            shuffle=bool(str(data.get("shuffle", "true")).lower() in {"1", "true", "yes", "on"}),
            validation_batch_size=(int(data["validation_batch_size"]) if data.get("validation_batch_size") not in (None, "") else None),
            early_stopping=bool(str(data.get("early_stopping", "false")).lower() in {"1", "true", "yes", "on"}),
            es_monitor=str(data.get("es_monitor", "val_loss")),
            es_mode=str(data.get("es_mode", "auto")),
            es_patience=int(data.get("es_patience", 5)),
            es_min_delta=float(data.get("es_min_delta", 0.0)),
            es_restore_best_weights=bool(str(data.get("es_restore_best_weights", "true")).lower() in {"1", "true", "yes", "on"}),
            reduce_lr=bool(str(data.get("reduce_lr", "false")).lower() in {"1", "true", "yes", "on"}),
            rlrop_monitor=str(data.get("rlrop_monitor", "val_loss")),
            rlrop_factor=float(data.get("rlrop_factor", 0.1)),
            rlrop_patience=int(data.get("rlrop_patience", 3)),
            rlrop_min_lr=float(data.get("rlrop_min_lr", 1e-6)),
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
        # If cancellation was requested before the worker started, respect it
        if job.status == TrainingStatus.CANCELLED:
            return

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

        # 2) Validate and build keras model using current builders API
        try:
            structure = validate_graph_payload(nodes, edges)
            model = build_keras_model(structure, nodes, edges)
        except Exception as exc:
            # Bubble up to the outer handler below for consistent job error handling
            raise exc
    except Exception as exc:
        job.status = TrainingStatus.FAILED
        # Include structured validation details when available
        try:
            from network.services.types import GraphValidationError  # type: ignore
        except Exception:  # pragma: no cover - defensive import
            GraphValidationError = Exception  # type: ignore

        if isinstance(exc, GraphValidationError):
            try:
                job.error = "Model build failed: " + json.dumps(getattr(exc, "detail", str(exc)))
            except Exception:
                job.error = f"Model build failed: {getattr(exc, 'detail', str(exc))}"
        else:
            job.error = f"Model build failed: {exc}"
        job.save(update_fields=["status", "error", "updated_at"])
        return

    try:
        # 3) Load params and dataset first (so we can validate compatibility before fitting)
        params = TrainParams.from_dict(job.params)

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

        # Heuristics about target
        def _is_integer_array(arr: np.ndarray) -> bool:
            try:
                return np.issubdtype(arr.dtype, np.integer) or np.all(np.equal(np.mod(arr, 1), 0))
            except Exception:
                return False

        def _is_one_hot(arr: np.ndarray) -> bool:
            if arr.ndim != 2 or arr.shape[1] < 2:
                return False
            vals = np.unique(arr)
            if not np.all(np.isin(vals, [0, 1])):
                return False
            row_sums = arr.sum(axis=1)
            # allow small numeric tolerance
            return np.all(np.isclose(row_sums, 1.0, atol=1e-6))

        # Probe selected loss to decide on one-hot conversion
        try:
            from keras import losses as _k_losses
            _probe_los = _k_losses.get(params.loss)
            loss_name_probe = getattr(_probe_los, "name", None) or str(_probe_los)
        except Exception:
            loss_name_probe = str(params.loss)

        def _coerce_one_hot_if_needed(arr: np.ndarray) -> np.ndarray:
            if arr.ndim == 1 and _is_integer_array(arr):
                classes = np.unique(arr)
                class_to_idx = {c: i for i, c in enumerate(classes)}
                idx = np.vectorize(lambda v: class_to_idx.get(v, 0))(arr)
                oh = np.eye(len(classes), dtype=np.float32)[idx]
                return oh
            return arr

        loss_lc = (loss_name_probe or str(params.loss)).lower()
        if params.y_one_hot or ("categorical_crossentropy" in loss_lc and "sparse_categorical_crossentropy" not in loss_lc):
            if y.ndim == 1 and _is_integer_array(y):
                y = _coerce_one_hot_if_needed(y)

        # Infer task and classes after potential conversion
        y_shape = y.shape
        y_is_sparse_labels = (y.ndim == 1) and _is_integer_array(y)
        y_is_one_hot = _is_one_hot(y)
        n_classes = int(len(np.unique(y))) if y_is_sparse_labels else (int(y.shape[1]) if y_is_one_hot else None)

        # 5) Build model to inspect output shape
        from keras import optimizers, losses, metrics as kmetrics
        try:
            structure = validate_graph_payload(
                list(job.graph.nodes.order_by("created_at").values("id", "type", "label", "params", "position", "notes")),
                [
                    dict(
                        id=e["id"],
                        source=e.get("source_id"),
                        target=e.get("target_id"),
                        meta=e.get("meta"),
                    )
                    for e in job.graph.edges.order_by("created_at").values("id", "source_id", "target_id", "meta")
                ],
            )
        except Exception:
            # already validated above; if it fails here, rethrow and let outer handler deal with it
            structure = None  # type: ignore
        model = build_keras_model(structure,  # type: ignore[arg-type]
                                  list(job.graph.nodes.order_by("created_at").values("id", "type", "label", "params", "position", "notes")),
                                  [
                                      {
                                          "id": e["id"],
                                          "source": e.get("source_id"),
                                          "target": e.get("target_id"),
                                          "meta": e.get("meta"),
                                      }
                                      for e in job.graph.edges.order_by("created_at").values("id", "source_id", "target_id", "meta")
                                  ])

        # Inspect output units
        out_shape = model.output_shape
        if isinstance(out_shape, (list, tuple)) and out_shape and isinstance(out_shape[0], (list, tuple)):
            oshape = out_shape[0]
        else:
            oshape = out_shape
        try:
            out_units = int(oshape[-1]) if isinstance(oshape, (list, tuple)) else int(getattr(oshape, "-1", 1))
        except Exception:
            out_units = None  # type: ignore

        # Normalize/identify loss & metrics
        los = losses.get(params.loss)
        loss_name = getattr(los, "name", None) or str(los)
        mets_raw = params.metrics or []

        # Auto-normalize 'accuracy' when possible
        normalized_metrics: List[Any] = []
        for m in mets_raw:
            m_low = str(m).lower()
            if m_low in {"accuracy", "acc"}:
                if "sparse_categorical_crossentropy" in loss_name:
                    normalized_metrics.append(kmetrics.get("sparse_categorical_accuracy"))
                elif "categorical_crossentropy" in loss_name:
                    normalized_metrics.append(kmetrics.get("categorical_accuracy"))
                elif "binary_crossentropy" in loss_name:
                    normalized_metrics.append(kmetrics.get("binary_accuracy"))
                else:
                    # For regression, 'accuracy' is meaningless; skip it
                    continue
            else:
                normalized_metrics.append(kmetrics.get(m))

        # 6) Validate compatibility and provide actionable messages
        errors: List[str] = []
        suggestions: List[str] = []

        # Classification vs regression heuristics
        is_binary = (n_classes == 2)
        is_multiclass = (n_classes is not None and n_classes > 2) or y_is_one_hot
        is_regression_target = not (y_is_sparse_labels or y_is_one_hot)

        def _require(cond: bool, msg: str):
            if not cond:
                errors.append(msg)

        # Loss-based expectations
        ln = loss_name.lower()
        if "sparse_categorical_crossentropy" in ln:
            _require(y_is_sparse_labels, "Loss 'sparse_categorical_crossentropy' expects integer class labels (e.g., 0..K-1) with shape [batch].")
            if out_units is not None:
                _require(out_units >= 2, f"Model output units should be the number of classes (>=2). Got {out_units}.")
                if n_classes is not None:
                    _require(out_units == n_classes, f"Model outputs {out_units} units but dataset has {n_classes} classes. Align final Dense units to number of classes.")
            suggestions.append("Use a final Dense(num_classes, activation='softmax') layer for multiclass classification.")
        elif "categorical_crossentropy" in ln:
            _require(y_is_one_hot, "Loss 'categorical_crossentropy' expects one-hot encoded targets with shape [batch, num_classes]. Consider one-hot encoding your labels or use 'sparse_categorical_crossentropy'.")
            if out_units is not None and y_is_one_hot:
                _require(out_units == y.shape[1], f"Model outputs {out_units} units but target one-hot dimension is {y.shape[1]}.")
            suggestions.append("Use a final Dense(num_classes, activation='softmax') layer for multiclass classification.")
        elif "binary_crossentropy" in ln:
            _require(is_binary or (y_is_one_hot and y.shape[1] == 1) or (y.ndim == 1), "'binary_crossentropy' expects binary targets (0/1).")
            if out_units is not None:
                _require(out_units == 1, f"Binary classification typically uses a single output unit with sigmoid. Got {out_units} units.")
            suggestions.append("Use a final Dense(1, activation='sigmoid') for binary classification.")
        else:
            # Assume regression-style loss
            if is_multiclass or (y_is_sparse_labels and (n_classes or 0) > 2):
                errors.append("Regression loss selected but the target looks like classification labels. Consider using 'sparse_categorical_crossentropy' (integer labels) or 'categorical_crossentropy' (one-hot).")
            if out_units is not None and y.ndim == 1:
                _require(out_units == 1, f"Regression targets with shape [batch] expect a single output unit. Got {out_units} units.")

        if errors:
            # Aggregate a friendly message and stop early before compile/fit
            message = (
                "Training configuration is incompatible:\n- "
                + "\n- ".join(errors)
            )
            if suggestions:
                message += "\n\nHow to fix:\n- " + "\n- ".join(suggestions)
            raise ValueError(message)

        # 7) Compile model with normalized metrics
        opt = optimizers.get(params.optimizer)
        # Apply learning rate override if provided
        try:
            if params.learning_rate is not None and hasattr(opt, "learning_rate"):
                # Some optimizers expose a tf.Variable; assign via attribute works in Keras 3
                opt.learning_rate = params.learning_rate  # type: ignore[attr-defined]
        except Exception:
            pass
        model.compile(optimizer=opt, loss=los, metrics=normalized_metrics)

        job.progress = 0.05
        job.save(update_fields=["progress", "updated_at"])

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

        # 8) Fit
        # Callback to push progress and live metrics after each epoch
        from tensorflow.keras.callbacks import Callback  # type: ignore
        from keras.callbacks import EarlyStopping, ReduceLROnPlateau  # type: ignore

        class _JobProgressCallback(Callback):  # pragma: no cover - relies on Keras runtime
            def __init__(self, jid: str, total_epochs: int):
                super().__init__()
                self.jid = jid
                self.total = max(int(total_epochs), 1)
                self.current_epoch = 0

            def on_epoch_begin(self, epoch, logs=None):  # type: ignore[override]
                self.current_epoch = int(epoch)

            def on_epoch_end(self, epoch, logs=None):  # type: ignore[override]
                try:
                    logs = logs or {}
                    frac = (epoch + 1) / float(self.total)
                    prog = 0.05 + 0.9 * float(frac)
                    # update live metrics snapshot
                    job_live = {
                        "epoch": int(epoch + 1),
                        "loss": float(logs.get("loss", 0.0)),
                    }
                    # include common metrics if present
                    for k in ("accuracy", "sparse_categorical_accuracy", "categorical_accuracy", "binary_accuracy", "val_loss"):
                        if k in logs:
                            job_live[k] = float(logs[k])
                    # perform atomic update
                    tj = TrainingJob.objects.filter(id=self.jid)
                    # read current result to merge live key without dropping history/evaluation
                    current = TrainingJob.objects.get(id=self.jid)
                    res = dict(current.result or {})
                    res["live"] = job_live
                    tj.update(progress=prog, result=res)

                    # Check for cancellation request and stop training early
                    if current.status == TrainingStatus.CANCELLED:
                        try:
                            self.model.stop_training = True  # type: ignore[attr-defined]
                        except Exception:
                            pass
                except Exception:
                    # best-effort; don't crash training on DB update issues
                    pass

            def on_train_batch_end(self, batch, logs=None):  # type: ignore[override]
                """Stream more frequent updates within an epoch to reduce UI jumps."""
                try:
                    logs = logs or {}
                    # steps per epoch from Keras runtime params
                    steps = int(self.params.get("steps") or self.params.get("steps_per_epoch") or 1)  # type: ignore[attr-defined]
                    steps = max(steps, 1)
                    frac_epoch = (int(batch) + 1) / float(steps)
                    overall = (self.current_epoch + frac_epoch) / float(self.total)
                    prog = 0.05 + 0.9 * float(overall)

                    job_live = {
                        "epoch": int(self.current_epoch + 1),  # human-friendly epoch index
                        "loss": float(logs.get("loss", 0.0)),
                    }
                    for k in ("accuracy", "sparse_categorical_accuracy", "categorical_accuracy", "binary_accuracy"):
                        if k in logs:
                            job_live[k] = float(logs[k])

                    # atomic update
                    tj = TrainingJob.objects.filter(id=self.jid)
                    current = TrainingJob.objects.get(id=self.jid)
                    res = dict(current.result or {})
                    # Preserve last known values for metrics not available at batch granularity (e.g., val_loss)
                    prev_live = dict((res.get("live") or {}))
                    for k in ("val_loss", "accuracy", "sparse_categorical_accuracy", "categorical_accuracy", "binary_accuracy"):
                        if k not in job_live and k in prev_live:
                            try:
                                job_live[k] = float(prev_live[k])
                            except Exception:
                                job_live[k] = prev_live[k]
                    res["live"] = job_live
                    tj.update(progress=prog, result=res)

                    if current.status == TrainingStatus.CANCELLED:
                        try:
                            self.model.stop_training = True  # type: ignore[attr-defined]
                        except Exception:
                            pass
                except Exception:
                    pass

        cb = _JobProgressCallback(str(job.id), params.epochs)
        # Add optional callbacks
        callbacks_list: List[Any] = [cb]
        if params.early_stopping:
            try:
                callbacks_list.append(
                    EarlyStopping(
                        monitor=params.es_monitor,
                        mode=params.es_mode,
                        patience=int(params.es_patience),
                        min_delta=float(params.es_min_delta),
                        restore_best_weights=bool(params.es_restore_best_weights),
                        verbose=0,
                    )
                )
            except Exception:
                pass
        if params.reduce_lr:
            try:
                callbacks_list.append(
                    ReduceLROnPlateau(
                        monitor=params.rlrop_monitor,
                        factor=float(params.rlrop_factor),
                        patience=int(params.rlrop_patience),
                        min_lr=float(params.rlrop_min_lr),
                        verbose=0,
                    )
                )
            except Exception:
                pass

        history = model.fit(
            X_train,
            y_train,
            epochs=params.epochs,
            batch_size=params.batch_size,
            validation_data=(X_val, y_val) if len(X_val) > 0 else None,
            validation_batch_size=(params.validation_batch_size or None),
            verbose=0,
            callbacks=callbacks_list,
            shuffle=bool(params.shuffle),
        )

        # Refresh job to observe cancellation state set by API during training
        job.refresh_from_db()
        if job.status == TrainingStatus.CANCELLED:
            # Preserve partial history; skip evaluation/artifact
            job.result = {
                "history": {k: [float(x) for x in v] for k, v in (history.history or {}).items()},
                "evaluation": None,
            }
            # Progress was updated incrementally during training; keep as-is
            job.save(update_fields=["result", "updated_at"])
            return

        job.progress = 0.95
        job.save(update_fields=["progress", "updated_at"])

        # 9) Evaluate
        eval_res = None
        if len(X_test) > 0:
            eval_res = model.evaluate(X_test, y_test, verbose=0)
            # Keras returns list if metrics set; map to names
            names = ["loss"] + [m.name if hasattr(m, "name") else str(m) for m in (normalized_metrics or [])]
            if isinstance(eval_res, (list, tuple)):
                eval_res = {k: float(v) for k, v in zip(names, eval_res)}
            else:
                eval_res = {"loss": float(eval_res)}

        # 10) Save artifact
        out_dir = _ensure_artifacts_dir()
        artifact = os.path.join(out_dir, f"{job.id}.keras")
        try:
            model.save(artifact)
            job.artifact_path = artifact
        except Exception as exc:
            # Saving is optional in phase 1; continue even if save fails
            job.error = job.error + f"\nArtifact save warning: {exc}" if job.error else f"Artifact save warning: {exc}"

        # 11) Persist results
        job.result = {
            "history": {k: [float(x) for x in v] for k, v in (history.history or {}).items()},
            "evaluation": eval_res,
        }
        job.status = TrainingStatus.SUCCEEDED
        job.progress = 1.0
        job.save(update_fields=["status", "result", "artifact_path", "progress", "error", "updated_at"])

    except Exception as exc:
        # If cancellation was requested, do not override with FAILED
        job.refresh_from_db()
        if job.status == TrainingStatus.CANCELLED:
            # Keep whatever was persisted already
            return
        job.status = TrainingStatus.FAILED
        # Improve common keras/tf messages with hints
        msg = str(exc)
        if "Arguments `target` and `output` must have the same rank" in msg:
            msg += "\nHint: For multiclass classification use Dense(num_classes, softmax) with (sparse_)categorical_crossentropy. For regression use Dense(1) with MSE/MAE."
        if "Incompatible shapes" in msg and ("[" in msg and "]" in msg):
            msg += "\nHint: Check that your target shape matches model outputs. Integer labels require sparse_categorical_crossentropy; one-hot labels require categorical_crossentropy."
        job.error = f"Training failed: {msg}"
        job.save(update_fields=["status", "error", "updated_at"])


def launch_training_job(job: TrainingJob) -> None:
    """Starts a background thread to process the given job."""
    t = threading.Thread(target=_train_worker, args=(str(job.id),), daemon=True)
    t.start()
