# Frontend (Vite + React)

This directory contains the Vite-powered frontend for the canvas editor and training UI.

## Environment variables

This project already reads the standard Vite env vars (`VITE_...`) from `.env`, `.env.local`, etc.

- `VITE_DJANGO_API_URL`: overrides the Django backend URL that the service clients talk to. If unset, it defaults to the current host origin.
- `VITE_USE_PRESIGNED_UPLOADS`: set to `true` to enable the presigned upload flow for datasets. When enabled, training uploads are sent directly to blob/object storage via SAS/pre-signed URLs before the backend starts the job. Leave it off (or unset) to keep the classic multipart upload path through Django.
- `VITE_PRESIGN_UPLOAD_HEADERS`: optional JSON object containing extra headers to set when PUTing to the presigned URL. For Azure Blob Storage you can pass `{"x-ms-blob-type":"BlockBlob"}`. These headers are merged with the generated `Content-Type` header for the file.

If you turn on `VITE_USE_PRESIGNED_UPLOADS`, ensure the backend has `USE_PRESIGNED_STORAGE_URLS=True` and the required Azure storage settings (`AZURE_ACCOUNT_NAME`, `AZURE_ACCOUNT_KEY`, `AZURE_CONTAINER`) so it can issue SAS URLs for the frontend.
