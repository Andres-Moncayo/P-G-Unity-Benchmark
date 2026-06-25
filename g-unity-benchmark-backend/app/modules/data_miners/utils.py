from __future__ import annotations

import logging
import random
import time
from pathlib import Path

from dotenv import dotenv_values

from core.config import settings

logger = logging.getLogger(__name__)

BLACKLISTED_TAVILY: dict[str, float] = {}
BLACKLISTED_GEMINI: dict[str, float] = {}
_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"


def _read_env_keys(prefix: str, count: int) -> list[str]:
    env_values = dotenv_values(_ENV_PATH) if _ENV_PATH.exists() else {}
    keys: list[str] = []

    for index in range(1, count + 1):
        raw_value = env_values.get(f"{prefix}_{index}")
        if raw_value is None:
            raw_value = getattr(settings, f"{prefix}_{index}", None)
        if raw_value is None:
            continue

        cleaned = str(raw_value).strip()
        if cleaned:
            keys.append(cleaned)

    return keys


def _load_keys(prefix: str, count: int) -> list[str]:
    return _read_env_keys(prefix, count)


def _purge_expired_blacklist(blacklist: dict[str, float]) -> None:
    now = time.time()
    expired = [key for key, expires_at in blacklist.items() if expires_at <= now]
    for key in expired:
        blacklist.pop(key, None)


def _filter_blacklisted(keys: list[str], blacklist: dict[str, float]) -> list[str]:
    _purge_expired_blacklist(blacklist)
    now = time.time()
    return [key for key in keys if blacklist.get(key, 0.0) <= now]


def mark_tavily_key_failed(key: str) -> None:
    cleaned = key.strip()
    if cleaned:
        expires_at = time.time() + 60
        BLACKLISTED_TAVILY[cleaned] = expires_at
        logger.warning(
            "data_miners blacklisted Tavily key=%s until=%s (blacklisted=%d)",
            f"{cleaned[:4]}...{cleaned[-4:]}" if len(cleaned) > 8 else cleaned,
            int(expires_at),
            len(BLACKLISTED_TAVILY),
        )


def mark_gemini_key_failed(key: str) -> None:
    cleaned = key.strip()
    if cleaned:
        expires_at = time.time() + 60
        BLACKLISTED_GEMINI[cleaned] = expires_at
        logger.warning(
            "data_miners blacklisted Gemini key=%s until=%s (blacklisted=%d)",
            f"{cleaned[:4]}...{cleaned[-4:]}" if len(cleaned) > 8 else cleaned,
            int(expires_at),
            len(BLACKLISTED_GEMINI),
        )


def _pick_key(keys: list[str], fallback_keys: list[str], blacklist: dict[str, float]) -> str:
    available = _filter_blacklisted(list(set(keys)), blacklist)
    if not available:
        available = fallback_keys
    if not available:
        raise ValueError("No keys configured in settings")
    return random.choice(available)


def get_robust_keys() -> tuple[str, str]:
    """Select Tavily and Gemini keys with in-memory failure blacklisting.

    The unique pool is built with ``set()`` to remove duplicate values. Temporarily
    blacklisted keys are filtered out for 60 seconds. If all keys are blacklisted,
    the original pool is used as a fallback.
    """

    tavily_keys = _load_keys("TAVILY_KEY", 4)
    gemini_keys = _load_keys("GEMINI_KEY", 6)

    if not tavily_keys:
        raise ValueError("No Tavily keys configured in settings")
    if not gemini_keys:
        raise ValueError("No Gemini keys configured in settings")

    tavily_key = _pick_key(tavily_keys, tavily_keys, BLACKLISTED_TAVILY)
    gemini_key = _pick_key(gemini_keys, gemini_keys, BLACKLISTED_GEMINI)

    logger.debug(
        "data_miners key pool selected Tavily=%s Gemini=%s (raw pool sizes: %d/%d)",
        f"{tavily_key[:4]}...{tavily_key[-4:]}" if len(tavily_key) > 8 else tavily_key,
        f"{gemini_key[:4]}...{gemini_key[-4:]}" if len(gemini_key) > 8 else gemini_key,
        len(tavily_keys),
        len(gemini_keys),
    )

    return tavily_key, gemini_key


def get_random_keys() -> tuple[str, str]:
    return get_robust_keys()
