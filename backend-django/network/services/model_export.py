import os
import tempfile
import keras
import tensorflow as tf


def export_model_to_tflite(model_path: str, output_path: str):
    """
    Convert a Keras model (file path) to TFLite format.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Load and export to SavedModel
        model = keras.models.load_model(model_path)
        # Keras 3: export to SavedModel directory
        try:
            model.export(temp_dir)
        except Exception:
            # Fallback: try saving as SavedModel
            model.save(temp_dir, save_format="tf")

        # Convert SavedModel to TFLite
        converter = tf.lite.TFLiteConverter.from_saved_model(temp_dir)
        tflite_model = converter.convert()

        with open(output_path, 'wb') as f:
            f.write(tflite_model)
