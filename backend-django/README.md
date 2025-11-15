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
- Celery is used for long-running work (training jobs and model import jobs). Start a worker with `celery -A config worker -l info --pool=solo` and a Redis broker to process tasks outside of Docker.

## Local development with Docker Redis and Celery

You can run the Django dev server on your Windows host while using the Redis container started by `docker-compose`. The key is to point Celery/Django to the correct broker URL depending on whether the process runs inside Docker or on the host.

- If you run Django/Celery inside Docker compose, use the compose service host: `redis://redis:6379/0`.
- If you run Django/Celery on the Windows host (recommended for faster iteration), use `redis://localhost:6379/0` because `docker-compose` publishes the container port to the host.

Example PowerShell workflow (host-run Django + Celery, assuming you have a virtualenv at `.venv`):

```powershell
cd "C:/Dysk F/Studia/ProjektInzynierski/MAID/backend-django"
# Activate venv (Windows PowerShell)
.\.venv\Scripts\activate

# Ensure Redis is running (via docker-compose in repo root) or start a standalone redis container:
docker compose up -d redis
# Or: docker run --rm -p 6379:6379 redis:7-alpine

# Export broker settings for host-run services
$env:CELERY_BROKER_URL = "redis://localhost:6379/0"
$env:CELERY_RESULT_BACKEND = "redis://localhost:6379/1"
$env:DJANGO_SETTINGS_MODULE = "config.settings"

# Prepare DB and start Django
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py loadmanifests
.\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000

# In another terminal (with venv active), start Celery worker (Windows requires --pool=solo):
.\.venv\Scripts\celery.exe -A config worker -l info --pool=solo

# (noe yet implemented) (Optional) start periodic scheduler:
.\.venv\Scripts\celery.exe -A config beat -l info
```

Notes & troubleshooting:

- On the host use `localhost` in the broker URL. The hostname `redis` resolves only inside the Docker network.
- If you see "Connection refused" from Celery, confirm `docker ps` shows Redis and that port `6379` is mapped. Also ensure no firewall blocks the port.
- On Windows, always use `--pool=solo` for Celery unless you have a worker environment that supports preforking.
- For fast iterative testing you can set `CELERY_TASK_ALWAYS_EAGER=True` (in `.env`) which runs tasks synchronously in-process and avoids needing a running worker.

## Import job workflow

- Authenticated users can POST `/api/network/import-jobs/` with `file`, `graph_name`, and optional `auto_create_graph` to enqueue Keras artifact imports.
- Use `GET /api/network/import-jobs/` to monitor status (`queued`, `processing`, `succeeded`, `failed`).
- Once the job succeeds, either call `POST /api/network/import-jobs/<id>/create-graph/` to persist the generated graph or copy the returned `graph_payload` into the existing graph APIs.
- The server enforces per-user pending job counts (`IMPORT_JOB_MAX_PENDING_PER_USER`) and storage quotas (`IMPORT_JOB_PENDING_STORAGE_LIMIT_MB`). Increase the env vars if you need to queue larger uploads locally.
