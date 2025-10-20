# Backend (Django)

This Django backend provides a REST API for building and compiling neural-network graphs used by the canvas editor.

## Requirements

- Python 3.11
- TensorFlow 2.20 (CPU) or compatible backend
- Keras 3.11.x
- See `requirements.txt` for the rest of Python dependencies

## Quick start

1. Create and activate a Python 3.11 virtual environment.
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   pip install --upgrade "tensorflow-cpu==2.20.*" "keras==3.11.*"
   ```

3. Run migrations and tests:

   ```bash
   python manage.py migrate
   python manage.py test
   ```

## Notes

- The network compiler requires Keras/TensorFlow at runtime. Without it, the compile endpoint will error.
- If you are using Windows, prefer the CPU build of TensorFlow unless you have a compatible GPU setup.
