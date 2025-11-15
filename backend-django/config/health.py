from __future__ import annotations

import json
import logging
from typing import Any, Dict

from django.db import connections
from django.http import JsonResponse
from django.conf import settings

logger = logging.getLogger(__name__)


def health(request):
    """Simple health endpoint that checks DB connectivity and Redis ping.

    Returns 200 with JSON {ok: True, db: True, redis: True} or details on failures.
    """
    status: Dict[str, Any] = {"ok": True}

    # DB check
    try:
        conn = connections[settings.DATABASES and "default" or 0]
        conn.cursor().execute("SELECT 1")
        status["db"] = True
    except Exception as exc:  # pragma: no cover - environment dependent
        logger.exception("DB health check failed")
        status["ok"] = False
        status["db"] = False
        status["db_error"] = str(exc)

    # Redis check (best-effort - optional dependency)
    try:
        import redis

        redis_url = getattr(settings, "CELERY_BROKER_URL", "redis://localhost:6379/0")
        # Parse host/port minimally
        client = redis.from_url(redis_url, socket_connect_timeout=1)
        status["redis"] = bool(client.ping())
    except Exception as exc:  # pragma: no cover - may not have redis locally
        logger.debug("Redis health check failed or redis not available: %s", exc)
        status["ok"] = False if status.get("ok", True) else status["ok"]
        status["redis"] = False
        status["redis_error"] = str(exc)

    code = 200 if status.get("ok") else 503
    return JsonResponse(status, status=code)
