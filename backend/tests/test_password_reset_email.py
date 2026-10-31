"""Unit tests for password-reset email helpers (no Mongo, no real Resend)."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.password_reset_email import (
    build_app_reset_url,
    build_reset_url,
    send_password_reset_email,
)


def test_build_reset_url_appends_token(monkeypatch):
    monkeypatch.setenv("PASSWORD_RESET_LINK_BASE", "http://localhost:8081/reset-password")
    assert (
        build_reset_url("abc")
        == "http://localhost:8081/reset-password?token=abc"
    )


def test_build_reset_url_uses_ampersand_when_query_exists(monkeypatch):
    monkeypatch.setenv("PASSWORD_RESET_LINK_BASE", "https://app.example/reset?src=mail")
    assert build_reset_url("tok") == "https://app.example/reset?src=mail&token=tok"


def test_build_app_reset_url_empty_when_unset(monkeypatch):
    monkeypatch.delenv("PASSWORD_RESET_APP_LINK_BASE", raising=False)
    assert build_app_reset_url("abc") == ""


def test_send_uses_resend_when_api_key_set(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("EMAIL_FROM", "HabitApp <beth.t@example.com>")
    monkeypatch.setenv("PASSWORD_RESET_LINK_BASE", "http://localhost:8081/reset-password")
    monkeypatch.delenv("PASSWORD_RESET_EMAIL_WEBHOOK_URL", raising=False)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = '{"id":"ok"}'
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.services.password_reset_email.httpx.AsyncClient", return_value=mock_client):
        asyncio.run(
            send_password_reset_email(
                to_email="you@example.com",
                user_name="Ana",
                reset_token="secret-token",
            )
        )

    mock_client.post.assert_awaited_once()
    args, kwargs = mock_client.post.await_args
    assert args[0] == "https://api.resend.com/emails"
    assert kwargs["headers"]["Authorization"] == "Bearer re_test"
    body = kwargs["json"]
    assert body["to"] == ["you@example.com"]
    assert "secret-token" in body["html"]
    assert "Ana" in body["html"]
