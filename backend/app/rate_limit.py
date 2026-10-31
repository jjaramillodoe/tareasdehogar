"""Simple in-memory sliding-window rate limiter for auth endpoints."""

from __future__ import annotations

import time
from collections import defaultdict
from typing import DefaultDict, List

from fastapi import HTTPException, Request


_hits: DefaultDict[str, List[float]] = defaultdict(list)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def enforce_rate_limit(key: str, *, limit: int, window_sec: int) -> None:
    now = time.time()
    bucket = _hits[key]
    cutoff = now - window_sec
    # Drop expired timestamps in place
    kept = [t for t in bucket if t >= cutoff]
    if len(kept) >= limit:
        _hits[key] = kept
        raise HTTPException(
            status_code=429,
            detail="Demasiados intentos. Espera un momento e inténtalo de nuevo.",
        )
    kept.append(now)
    _hits[key] = kept
