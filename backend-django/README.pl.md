# Backend (Django) - Wersja Polska

Backend w Django udostępnia REST API do budowania i kompilowania grafów sieci neuronowych używanych przez canvas.

## Wymagania

- Python 3.11
- TensorFlow 2.20 (CPU) lub kompatybilny backend
- Keras 3.11.x
- Zobacz `requirements.txt` dla reszty zależności

## Szybki start

1. Stwórz i aktywuj środowisko venv Python 3.11.
2. Zainstaluj zależności:

   ```bash
   pip install -r requirements.txt
   pip install --upgrade "tensorflow-cpu==2.20.*" "keras==3.11.*"
   ```

3. Uruchom migracje i testy:

   ```bash
   python manage.py migrate
   python manage.py test
   ```


## Lokalny development z Docker Redis i Celery

Możesz odpalić serwer Django na hoście Windows używając kontenera Redis odpalonego przez `docker-compose`. Kluczem jest wskazanie Celery/Django poprawnego URL (w .env) w zależności od tego, czy proces działa wewnątrz Dockera czy na hoście.

- Jeśli odpalasz Django/Celery wewnątrz Docker compose, użyj nazwy serwisu compose: `redis://redis:6379/0`.
- Jeśli odpalasz Django/Celery na hoście Windows (np. przy developmencie), użyj `redis://localhost:6379/0`, bo `docker-compose` wystawia port kontenera na hosta.

Przykładowy workflow PowerShell (Django + Celery na hoście, zakładając że masz virtualenv w `.venv`):

```powershell
cd "C:/Dysk F/Studia/ProjektInzynierski/MAID/backend-django"
# Aktywuj venv (Windows PowerShell)
.\.venv\Scripts\activate

# Upewnij się, że Redis działa (przez docker-compose w root repo) albo odpal standalone kontener redis:
docker compose up -d redis
# Albo: docker run --rm -p 6379:6379 redis:7-alpine

# Wyeksportuj ustawienia brokera dla serwisów na hoście
$env:CELERY_BROKER_URL = "redis://localhost:6379/0"
$env:CELERY_RESULT_BACKEND = "redis://localhost:6379/1"
$env:DJANGO_SETTINGS_MODULE = "config.settings"
# Albo ustaw zmienne w .env

# Przygotuj DB i odpal Django
python manage.py migrate
python manage.py loadmanifests
python manage.py runserver 0.0.0.0:8000

# W innym terminalu (z aktywnym venv), odpal workera Celery (Windows wymaga --pool=solo):
celery -A config worker -l info --pool=solo

# Jeszcze nie zaimplementowy, ale jest jeszcze opcja włączenia okresowego schedulera:
celery -A config beat -l info
```

Uwagi i rozwiązywanie problemów:

- Na hoście używaj `localhost` w URL brokera. Hostname `redis` rozwiązuje się tylko wewnątrz sieci Docker.
- Jeśli widzisz "Connection refused" z Celery, sprawdź `docker ps` czy Redis działa i czy port `6379` jest zmapowany i niezajęty.
- Na Windowsie trzeba dodać flagę `--pool=solo` dla Celery, chyba że ma się środowisko workera wspierające preforking.
- Ewentulanie dla szybkiego testowania można ustawić `CELERY_TASK_ALWAYS_EAGER=True` (w `.env`), co odpala taski synchronicznie w procesie i nie wymaga działającego workera.


## Uwagi

- Kompilator wymaga Keras/TensorFlow w runtime'ie. Bez tego endpoint kompilacji wywali błąd.
- Jeśli używasz Windowsa, preferuj build CPU TensorFlow, chyba że masz kompatybilny setup GPU.
- Celery jest używane do długotrwałych zadań (training jobs i model import jobs). Odpal workera za pomocą `celery -A config worker -l info --pool=solo` i brokera Redis, żeby przetwarzać taski poza Dockerem.

## Storage & Presigned Uploads

- **O co chodzi:** Backend teraz wspiera przechowywanie dużych artefaktów (datasety, wytrenowane modele, importy grafów) używając `default_storage` z Django. Później będzie można skonfigurować Azure Blob Storage (lub jakikolwiek inny backend storage'owy Django), zachowując lokalny filesystem jako fallback do developmentu.
- **Presigned URLs:** Kiedy skonfigurowany jest object storage, API może wystawiać ograniczone czasowo presignowane URL upload/download (SAS dla Azure). To pozwala wrzucać duże pliki bezpośrednio do blob storage bez przepychania ich przez Django, plus jakby była potrzeba to można jest z tamtąd pobrać np. do backendu ASP.NET.

- **Dlaczego to pomaga:** jeśli zaszłaby potrzeba, to zmniejsza zużycie pamięci i sieci na serwerze Django, umożliwia duże uploady z przeglądarek/klientów i centralizuje cykl życia obiektów przez backend storage'owy.

## Nowe Endpointy API (storage-aware)

- **Training (direct upload):** `POST /api/network/graphs/{graph_id}/train` — przyjmuje pole multipart `file` (CSV) i kolejkuje joba - działa tak jak wcześniej, ale teraz zapisuje datasety przez `default_storage` jeśli jest dostępny.
- **Training (presign):** `POST /api/network/graphs/{graph_id}/presign-upload` — waliduje parametry treningu, tworzy zakolejkowany `TrainingJob` i zwraca `{ job_id, upload_url }`. Klient wrzuca CSV bezpośrednio na podany `upload_url`, a potem requestuje `POST /api/network/training-jobs/{job_id}/start`, żeby zacząć trenowanie.
- **Training start:** `POST /api/network/training-jobs/{job_id}/start` — weryfikuje, czy dataset istnieje w storage (lub lokalnie) i kolejkuje task treningowy w Celery.

- **Model import (direct upload):** `POST /api/network/import-jobs/` — przyjmuje pole multipart `file` i kolejkuje import joba; wrzucony artefakt jest zapisywany przez `default_storage`.
- **Model import (presign):** `POST /api/network/import-jobs/presign-upload` — podaj `filename` w body; zwraca `{ job_id, upload_url }`. Klient wrzuca artefakt bezpośrednio do storage, a potem odpala przetwarzanie (więcej niżej).

## Zmiany w zachowaniu

- **Ścieżki do artefaktów:** `TrainingJob.dataset_path`, `TrainingJob.artifact_path` i `ModelImportJob.stored_path` zawierają teraz klucze storage, gdy używany jest zdalny backend (np. `datasets/job-<id>.csv` lub `artifacts/<id>.keras`). Kod w workerze i widokach używa helperów `network.storage` do otwierania strumieni, sprawdzania istnienia, usuwania obiektów czy zapisywania plików.
- **Kompatybilność workera:** workery w tle pobiorą zdalne artefakty do pliku tymczasowego przed przetwarzaniem (loadery Keras oczekują ścieżki do pliku). Pliki tymczasowe są czyszczone po użyciu.
- **Fallbacki:** Jeśli `default_storage` nie jest skonfigurowany lub helpery presign są niedostępne, aplikacja wraca do lokalnego zapisu na filesystemie w `ARTIFACTS_DIR` (domyślnie: `<project_root>/artifacts`).

## Zmienne środowiskowe / ustawienia

- **Storage & presign:**
  - `AZURE_ACCOUNT_NAME`, `AZURE_ACCOUNT_KEY`, `AZURE_CONTAINER` — konfiguracja poświadczeń Azure Blob Storage (opcjonalne).
  - `AZURE_SSL` — ustaw na `True`, żeby używać `https` przy generowaniu URLi SAS.
  - `USE_PRESIGNED_STORAGE_URLS` — jeśli `True`, API będzie zwracać presigned upload/download URLs tam gdzie dostępne.
- **Limity artefaktów:**
  - `MAX_UPLOAD_SIZE` — maksymalny rozmiar uploadu w bajtach dla direct uploads (domyślnie 10 MB).
  - `IMPORT_JOB_ALLOWED_EXTENSIONS` — dozwolone rozszerzenia importowanych artefaktów (domyślnie: `.keras`, `.h5`, `.zip`).
  - `IMPORT_JOB_PENDING_STORAGE_LIMIT_MB` — opcjonalny limit całkowitych oczekujących bajtów importu na usera.

## Dodane zależności

- Jeśli planujesz odpalać z Postgres lub Azure storage, upewnij się, że masz zainstalowane te biblioteki (dodane `requirements.txt`):
  - `psycopg2-binary` — adapter Postgres dla Django
  - `azure-storage-blob` — Azure Blob SDK używany do generowania tokenów SAS
  - `django-storages` — opcjonalne, do integracji Azure Blob jako `default_storage`

## Przykład: presign upload i start (PowerShell)

1. Zażądaj presigned upload URL dla datasetu treningowego:

```powershell
$token = "<your-auth-token>"
$graphId = "<graph-uuid>"
$params = @{ x_columns = @("feat1","feat2"); y_column = "label" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/network/graphs/$graphId/presign-upload" -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } -Body $params
# Response: { "job_id": "<id>", "upload_url": "https://...sas..." }
```

2. Wrzuć plik na zwrócony URL SAS (przykład Azure — użyj PUT i `x-ms-blob-type: BlockBlob`):

```powershell
$uploadUrl = "<upload_url_from_previous_step>"
Invoke-RestMethod -Method Put -Uri $uploadUrl -InFile "C:\path\to\dataset.csv" -Headers @{ "x-ms-blob-type" = "BlockBlob"; "Content-Type" = "text/csv" }
```

3. Odpal training job:

```powershell
$jobId = "<job-id-from-presign>"
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/network/training-jobs/$jobId/start" -Headers @{ Authorization = "Bearer $token" }
```

## Uwagi i co dalej

- Endpointy presign obecnie zwracają goły URL. Dla uploadów Azure Blob zazwyczaj trzeba ustawić `x-ms-blob-type: BlockBlob`. Można zmienić API, żeby zwracało jawny obiekt `headers` (i przykładową komendę dla klienta) obok URL.
- Przydałoby się dodać testy integracyjne używając emulatora Azurite (dla Azure) albo mockowania `network.storage` w unit testach, żeby zwalidować flow presign i streamowania.
- Jeśli wolicie automatyczną weryfikację po stronie serwera i auto-start po uploadzie (zamiast wołania `start` przez klienta), mogę zaimplementować endpoint weryfikacyjny albo async poller, który wykrywa kiedy presigned upload się zakończy i kolejkuje joba.

## Workflow importu jobów

- Zalogowani userzy mogą robić requesty POST na `/api/network/import-jobs/` z `file`, `graph_name` i opcjonalnym `auto_create_graph`, żeby zakolejkować import artefaktów Keras.
- `GET /api/network/import-jobs/`, żeby monitorować status (`queued`, `processing`, `succeeded`, `failed`).
- Jak job się uda, albo `POST /api/network/import-jobs/<id>/create-graph/`, żeby zapisać wygenerowany graf, albo kopiowanie zwróconego `graph_payload` do endpointu grafów `/api/network/graphs/`.
- Serwer wymusza limity oczekujących jobów na usera (`IMPORT_JOB_MAX_PENDING_PER_USER`) i limity storage (`IMPORT_JOB_PENDING_STORAGE_LIMIT_MB`). Jeśli zdażyłoby się używać większych uploadów, to trzeba zwiększyć ten limit.