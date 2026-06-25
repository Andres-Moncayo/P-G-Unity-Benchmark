"""In-memory TTL cache for expensive dashboard KPI payloads."""

from __future__ import annotations

import time
from threading import Lock
from typing import Any, Callable

_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_LOCK = Lock()
DEFAULT_TTL_SECONDS = 300


def get_or_set_dashboard_cache(
    key: str,
    builder: Callable[[], dict[str, Any]],
    *,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> dict[str, Any]:
    now = time.monotonic()
    with _LOCK:
        cached = _CACHE.get(key)
        if cached is not None and now - cached[0] < ttl_seconds:
            return cached[1]

    payload = builder()
    with _LOCK:
        _CACHE[key] = (now, payload)
    return payload
