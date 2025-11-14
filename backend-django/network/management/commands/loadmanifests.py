"""
Management command to load TensorFlow/Keras manifests into memory.

This ensures manifests are loaded and available for the application.
Useful as a post-startup command or for troubleshooting.
"""
from django.core.management.base import BaseCommand
from network.manifests import activations, layers, losses, metrics, optimizers


class Command(BaseCommand):
    help = 'Load TensorFlow/Keras manifests into memory'

    def handle(self, *args, **options):
        self.stdout.write("Loading TensorFlow/Keras manifests...")
        
        try:
            activations.refresh_manifest()
            self.stdout.write(self.style.SUCCESS(f"✓ Activations: {len(activations.list_activations())} loaded"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Activations failed: {e}"))
        
        try:
            layers.refresh_manifest()
            self.stdout.write(self.style.SUCCESS(f"✓ Layers: {len(layers.list_layers())} loaded"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Layers failed: {e}"))
        
        try:
            losses.refresh_manifest()
            self.stdout.write(self.style.SUCCESS(f"✓ Losses: {len(losses.list_losses())} loaded"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Losses failed: {e}"))
        
        try:
            metrics.refresh_manifest()
            self.stdout.write(self.style.SUCCESS(f"✓ Metrics: {len(metrics.list_metrics())} loaded"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Metrics failed: {e}"))
        
        try:
            optimizers.refresh_manifest()
            self.stdout.write(self.style.SUCCESS(f"✓ Optimizers: {len(optimizers.list_optimizers())} loaded"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Optimizers failed: {e}"))
        
        self.stdout.write(self.style.SUCCESS("\nAll manifests loaded successfully!"))
