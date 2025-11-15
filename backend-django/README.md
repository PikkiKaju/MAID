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
- Celery is used for long-running work (training jobs and model import jobs). Start a worker with `celery -A config worker -l info --pool=solo` and a Redis broker to process tasks outside of Docker.

## Import job workflow

- Authenticated users can POST `/api/network/import-jobs/` with `file`, `graph_name`, and optional `auto_create_graph` to enqueue Keras artifact imports.
- Use `GET /api/network/import-jobs/` to monitor status (`queued`, `processing`, `succeeded`, `failed`).
- Once the job succeeds, either call `POST /api/network/import-jobs/<id>/create-graph/` to persist the generated graph or copy the returned `graph_payload` into the existing graph APIs.
