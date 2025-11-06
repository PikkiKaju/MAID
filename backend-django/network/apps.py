from django.apps import AppConfig


class NetworkConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "network"
    verbose_name = "Neural Network Canvas"

    def ready(self) -> None:  # type: ignore[override]
        """Optionally generate TensorFlow/Keras manifests on app startup.

        This runs only when enabled via env (default: enabled) and only generates
        manifests that are missing or empty. It keeps import costs minimal by
        importing heavy modules lazily and only when needed.
        """
        import os
        import sys
        from pathlib import Path

        # Allow disabling in environments where TF isn't available or wanted
        enabled = os.getenv("NETWORK_GENERATE_TF_MANIFESTS", "true").lower() in {"1", "true", "yes"}
        force = os.getenv("NETWORK_FORCE_REGENERATE_TF_MANIFESTS", "false").lower() in {"1", "true", "yes"}

        # Avoid doing work for commands where we don't need manifests (e.g., collectstatic)
        argv = " ".join(sys.argv).lower()
        skip_for = ("makemigrations" in argv) or ("collectstatic" in argv)
        if not enabled or skip_for:
            return

        # manifests directory: network/tensorflow_data/manifests
        base_dir = Path(__file__).resolve().parent
        manifests_dir = (base_dir / "tensorflow_data" / "manifests").resolve()
        manifests_dir.mkdir(parents=True, exist_ok=True)

        targets = {
            "layers": manifests_dir / "layer_manifest.json",
            "optimizers": manifests_dir / "optimizer_manifest.json",
            "metrics": manifests_dir / "metric_manifest.json",
            "activations": manifests_dir / "activation_manifest.json",
            "losses": manifests_dir / "loss_manifest.json",
        }

        def needs(path: Path) -> bool:
            try:
                return force or (not path.exists()) or (path.stat().st_size == 0)
            except Exception:
                return True

        # Generate only what we need; import generators lazily
        try:
            if needs(targets["activations"]):
                from .tensorflow_data.generators.generate_activations_manifest import generate_manifest as gen_act
                gen_act()
            if needs(targets["metrics"]):
                from .tensorflow_data.generators.generate_metrics_manifest import generate_manifest as gen_metrics
                gen_metrics()
            if needs(targets["losses"]):
                from .tensorflow_data.generators.generate_losses_manifest import generate_manifest as gen_losses
                gen_losses()
            if needs(targets["optimizers"]):
                from .tensorflow_data.generators.generate_optimizers_manifest import generate_manifest as gen_opts
                gen_opts()
            if needs(targets["layers"]):
                from .tensorflow_data.generators.generate_layer_manifest import regenerate_and_save_layer_manifest as gen_layers
                gen_layers()

            # Load all manifests into memory after generating
            # This initializes the _MANIFEST global in each module
            from .manifests import activations, layers, losses, metrics, optimizers
            activations.refresh_manifest()
            layers.refresh_manifest()
            losses.refresh_manifest()
            metrics.refresh_manifest()
            optimizers.refresh_manifest()
        except Exception as exc:  # pragma: no cover - startup convenience
            # Log to stdout; app should still start even if generation failed
            import logging
            logging.getLogger(__name__).warning("Manifest generation or loading failed: %s", exc)
        return
