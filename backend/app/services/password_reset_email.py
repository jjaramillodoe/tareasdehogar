"""Password-reset email: Resend (preferred) or a generic HTTP webhook."""

from __future__ import annotations

import html
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

RESEND_EMAILS_URL = "https://api.resend.com/emails"


def _ttl_minutes() -> int:
    try:
        return max(1, int(os.environ.get("PASSWORD_RESET_TOKEN_TTL_MINUTES", "60")))
    except ValueError:
        return 60


def _append_token(base: str, raw_token: str) -> str:
    base = (base or "").strip()
    if not base:
        return ""
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}token={raw_token}"


def build_reset_url(raw_token: str) -> str:
    """Primary link shown in the email (HTTPS recommended; custom schemes often get blocked)."""
    base = os.environ.get("PASSWORD_RESET_LINK_BASE", "habitapp://reset-password").strip()
    if not base:
        base = "habitapp://reset-password"
    return _append_token(base, raw_token)


def build_app_reset_url(raw_token: str) -> str:
    """Optional native deep link, e.g. habitapp://reset-password."""
    base = os.environ.get("PASSWORD_RESET_APP_LINK_BASE", "").strip()
    if not base:
        return ""
    return _append_token(base, raw_token)


def _from_address() -> str:
    raw = os.environ.get("EMAIL_FROM", "").strip()
    if raw:
        return raw
    name = os.environ.get("EMAIL_FROM_NAME", "HabitApp").strip() or "HabitApp"
    return f"{name} <beth.t@example.com>"


def render_reset_email(*, user_name: str, reset_url: str, app_url: str = "") -> tuple[str, str]:
    """Return (html, text) bodies for the reset message."""
    safe_name = html.escape((user_name or "").strip() or "hola")
    ttl = _ttl_minutes()
    app_block_html = ""
    app_block_text = ""
    if app_url:
        safe_app = html.escape(app_url, quote=True)
        app_block_html = f"""
          <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#5a6a7a;">
            Si tienes la app instalada, también puedes abrir este enlace:<br>
            <a href="{safe_app}" style="color:#1A8CFF;word-break:break-all;">{html.escape(app_url)}</a>
          </p>
        """
        app_block_text = f"\nApp: {app_url}\n"

    html_body = f"""\
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Georgia,Palatino,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #d7e4f5;">
        <tr>
          <td style="background:#1A8CFF;padding:22px 28px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#d6ebff;">HabitApp</p>
            <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;">Restablece tu contraseña</h1>
          </td>
        </tr>
        <tr>
          <td style="height:5px;background:#FFD400;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 12px;font-size:16px;color:#1a2433;">Hola {safe_name},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#2f4158;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta de tutor en HabitApp.
              El enlace caduca en <strong>{ttl} minutos</strong> y solo se puede usar una vez.
            </p>
            <p style="margin:0 0 28px;text-align:center;">
              <a href="{html.escape(reset_url, quote=True)}"
                 style="display:inline-block;background:#1A8CFF;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:8px;">
                Elegir nueva contraseña
              </a>
            </p>
            <p style="margin:0;font-size:12px;line-height:1.5;color:#5a6a7a;">
              Si el botón no funciona, copia este enlace en el navegador:<br>
              <a href="{html.escape(reset_url, quote=True)}" style="color:#1A8CFF;word-break:break-all;">{html.escape(reset_url)}</a>
            </p>
            {app_block_html}
            <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#5a6a7a;">
              Si no pediste este cambio, puedes ignorar este correo. Tu contraseña no se modifica hasta que elijas una nueva.
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#8a97a6;">HabitApp · tareas del hogar en familia</p>
    </td></tr>
  </table>
</body>
</html>
"""
    text_body = (
        f"Hola {user_name or 'hola'},\n\n"
        f"Restablece tu contraseña de HabitApp (caduca en {ttl} minutos):\n"
        f"{reset_url}\n"
        f"{app_block_text}\n"
        "Si no pediste este cambio, ignora este correo.\n"
    )
    return html_body, text_body


async def _send_via_resend(*, to_email: str, user_name: str, reset_url: str, app_url: str) -> None:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    html_body, text_body = render_reset_email(user_name=user_name, reset_url=reset_url, app_url=app_url)
    payload: dict[str, Any] = {
        "from": _from_address(),
        "to": [to_email],
        "subject": "Restablece tu contraseña de HabitApp",
        "html": html_body,
        "text": text_body,
    }
    reply_to = os.environ.get("EMAIL_REPLY_TO", "").strip()
    if reply_to:
        payload["reply_to"] = reply_to

    timeout = httpx.Timeout(20.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            RESEND_EMAILS_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        if r.status_code >= 400:
            logger.error("Resend rejected password-reset email (%s): %s", r.status_code, r.text[:500])
            r.raise_for_status()
        logger.info("Password-reset email sent via Resend to %s", to_email)


async def _send_via_webhook(*, to_email: str, user_name: str, reset_url: str, app_url: str) -> None:
    webhook = os.environ.get("PASSWORD_RESET_EMAIL_WEBHOOK_URL", "").strip()
    payload: dict[str, Any] = {
        "event": "password_reset",
        "to_email": to_email,
        "user_name": user_name,
        "reset_url": reset_url,
    }
    if app_url:
        payload["app_reset_url"] = app_url

    headers: dict[str, str] = {"Content-Type": "application/json"}
    secret = os.environ.get("PASSWORD_RESET_EMAIL_WEBHOOK_SECRET", "").strip()
    if secret:
        headers["Authorization"] = f"Bearer {secret}"

    timeout = httpx.Timeout(20.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(webhook, json=payload, headers=headers)
        r.raise_for_status()
        logger.info("Password-reset email dispatched via webhook")


async def send_password_reset_email(*, to_email: str, user_name: str, reset_token: str) -> None:
    """
    Send the reset link with Resend when RESEND_API_KEY is set.
    Otherwise POST JSON to PASSWORD_RESET_EMAIL_WEBHOOK_URL (SendGrid/Make/etc.).
    If neither is set, log a warning — nothing is sent.
    """
    reset_url = build_reset_url(reset_token)
    app_url = build_app_reset_url(reset_token)
    if os.environ.get("RESEND_API_KEY", "").strip():
        await _send_via_resend(
            to_email=to_email, user_name=user_name, reset_url=reset_url, app_url=app_url
        )
        return
    if os.environ.get("PASSWORD_RESET_EMAIL_WEBHOOK_URL", "").strip():
        await _send_via_webhook(
            to_email=to_email, user_name=user_name, reset_url=reset_url, app_url=app_url
        )
        return
    logger.warning(
        "No email provider configured; password reset was not sent. "
        "Set RESEND_API_KEY (recommended) or PASSWORD_RESET_EMAIL_WEBHOOK_URL."
    )
