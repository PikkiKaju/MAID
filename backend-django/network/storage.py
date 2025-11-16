from __future__ import annotations

import os
from typing import BinaryIO, Optional

from django.conf import settings
from django.core.files.storage import default_storage

try:
    from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
    from azure.core.exceptions import AzureError
except Exception:  # pragma: no cover - optional dependency
    BlobServiceClient = None  # type: ignore
    generate_blob_sas = None
    BlobSasPermissions = None
    AzureError = Exception


def save_file(key: str, file_obj: BinaryIO) -> str:
    """Save file-like object to configured storage using Django `default_storage`.

    Returns the storage key.
    """
    # default_storage.save expects a name and a File object; file_obj may be a raw binary stream
    # Wrap into ContentFile if necessary
    try:
        from django.core.files.base import ContentFile

        file_obj.seek(0)
        content = ContentFile(file_obj.read())
        name = default_storage.save(key, content)
        return name
    except Exception:
        # Fallback: write to local artifacts dir
        path = os.path.join(str(settings.ARTIFACTS_DIR), key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            try:
                file_obj.seek(0)
            except Exception:
                pass
            f.write(file_obj.read())
        return path


def open_stream(key: str):
    """Return a readable file-like object for the key using `default_storage`.

    Caller is responsible for closing the returned object.
    """
    try:
        return default_storage.open(key, mode="rb")
    except Exception:
        # Try local filesystem fallback
        local = os.path.join(str(settings.ARTIFACTS_DIR), key)
        return open(local, "rb")


def exists(key: str) -> bool:
    try:
        return default_storage.exists(key)
    except Exception:
        return os.path.exists(os.path.join(str(settings.ARTIFACTS_DIR), key))


def delete(key: str) -> None:
    try:
        if default_storage.exists(key):
            default_storage.delete(key)
            return
    except Exception:
        pass
    # Local fallback
    local = os.path.join(str(settings.ARTIFACTS_DIR), key)
    try:
        if os.path.exists(local):
            os.remove(local)
    except Exception:
        pass


def generate_azure_presigned_download(key: str, expires: int = 3600) -> Optional[str]:
    """Generate a SAS URL for Azure Blob Storage for the given key.

    Returns the URL or None if Azure SDK/settings are not available.
    """
    if not getattr(settings, "AZURE_ACCOUNT_NAME", None):
        return None
    if BlobServiceClient is None or generate_blob_sas is None:
        return None

    account_name = settings.AZURE_ACCOUNT_NAME
    account_key = settings.AZURE_ACCOUNT_KEY
    container = settings.AZURE_CONTAINER
    try:
        from datetime import datetime, timedelta

        sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=container,
            blob_name=key,
            account_key=account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(datetime.timezone.utc) + timedelta(seconds=expires),
        )
        scheme = "https" if settings.AZURE_SSL else "http"
        url = f"{scheme}://{account_name}.blob.core.windows.net/{container}/{key}?{sas_token}"
        return url
    except Exception:
        return None


def generate_azure_presigned_upload(key: str, expires: int = 3600) -> Optional[str]:
    """Generate a presigned URL (SAS) for uploading a blob to Azure.

    Returns the URL or None if not available.
    """
    if not getattr(settings, "AZURE_ACCOUNT_NAME", None):
        return None
    if generate_blob_sas is None:
        return None
    try:
        from datetime import datetime, timedelta

        sas_token = generate_blob_sas(
            account_name=settings.AZURE_ACCOUNT_NAME,
            container_name=settings.AZURE_CONTAINER,
            blob_name=key,
            account_key=settings.AZURE_ACCOUNT_KEY,
            permission=BlobSasPermissions(read=True, write=True, create=True),
            expiry=datetime.now(datetime.timezone.utc) + timedelta(seconds=expires),
        )
        scheme = "https" if settings.AZURE_SSL else "http"
        url = f"{scheme}://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER}/{key}?{sas_token}"
        return url
    except Exception:
        return None


def get_presigned_download(key: str, expires: int = 3600) -> Optional[str]:
    """Provider-agnostic presigned download URL generator.

    Currently supports Azure via settings/Azure SDK. Returns URL string or None.
    """
    url = None
    try:
        url = generate_azure_presigned_download(key, expires=expires)
    except Exception:
        url = None
    return url
