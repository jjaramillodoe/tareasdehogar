"""Send password-reset notifications via an optional HTTP webhook (e.g. SendGrid, Resend, internal API)."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def build_reset_url(raw_token: str) -> str:
    base = os.environ.get("PASSWORD_RESET_LINK_BASE", "habitapp://reset-password").strip()
    if not base:
        base = "habitapp://reset-password"
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}token={raw_token}"


async def send_password_reset_email(*, to_email: str, user_name: str, reset_token: str) -> None:
    """
    POSTs a JSON payload to PASSWORD_RESET_EMAIL_WEBHOOK_URL when set.
    If unset, logs a warning (no email sent — configure webhook for production).
    """
    webhook = os.environ.get("PASSWORD_RESET_EMAIL_WEBHOOK_URL", "").strip()
    reset_url = build_reset_url(reset_token)
    payload: dict[str, Any] = {
        "event": "password_reset",
        "to_email": to_email,
        "user_name": user_name,
        "reset_url": reset_url,
    }
    if not webhook:
        logger.warning(
            "PASSWORD_RESET_EMAIL_WEBHOOK_URL is not set; password reset email was not sent "
            "(configure the webhook to deliver reset links in production)."
        )
        return

    headers: dict[str, str] = {"Content-Type": "application/json"}
    secret = os.environ.get("PASSWORD_RESET_EMAIL_WEBHOOK_SECRET", "").strip()
    if secret:
        headers["Authorization"] = f"Bearer {secret}"

    timeout = httpx.Timeout(20.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(webhook, json=payload, headers=headers)
        r.raise_for_status()
