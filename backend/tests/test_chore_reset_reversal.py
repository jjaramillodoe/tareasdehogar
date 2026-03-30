"""
Integration: approve a chore (credit child balance), then reset — balance must return to 0.

Requires MongoDB (default: mongodb://127.0.0.1:27017). Override with MONGO_URL.

Run from backend/:
  pytest tests/test_chore_reset_reversal.py -v
"""

from __future__ import annotations

import asyncio
import os
import uuid

import pytest
from starlette.testclient import TestClient


def _mongo_reachable() -> bool:
    """True if we can ping MongoDB (respects MONGO_URL, e.g. Atlas or local)."""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient

        url = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")

        async def ping() -> None:
            client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=4000)
            try:
                await client.admin.command("ping")
            finally:
                client.close()

        asyncio.run(ping())
        return True
    except Exception:
        return False


async def _drop_test_database() -> None:
    from motor.motor_asyncio import AsyncIOMotorClient

    url = os.environ["MONGO_URL"]
    dbname = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=8000)
    try:
        await client.drop_database(dbname)
    finally:
        client.close()


pytestmark = pytest.mark.skipif(not _mongo_reachable(), reason="MongoDB not reachable (start local Mongo or set MONGO_URL)")


@pytest.fixture(scope="module")
def api_client():
    """Drop the test database once, then serve the app via TestClient."""
    asyncio.run(_drop_test_database())

    # Import after conftest.py configured env (pytest loads conftest before this module).
    from app.main import app

    with TestClient(app) as client:
        yield client


def test_reset_reverses_child_balance_after_approve(api_client: TestClient):
    email = f"t{uuid.uuid4().hex[:16]}@example.com"
    password = "test-secret-123"
    headers: dict[str, str] = {}

    r = api_client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Test Parent"},
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    headers["Authorization"] = f"Bearer {token}"

    r = api_client.post(
        "/api/families",
        json={"name": "Test Fam", "currency": "USD", "country_code": "US"},
        headers=headers,
    )
    assert r.status_code == 200, r.text

    r = api_client.post(
        "/api/children",
        json={"name": "Test Kid", "age": 10},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    child_id = r.json()["id"]

    r = api_client.post(
        "/api/chores",
        json={
            "title": "Sweep",
            "amount": 10.0,
            "frequency": "unica",
            "assigned_to": [child_id],
        },
        headers=headers,
    )
    assert r.status_code == 200, r.text
    chore_id = r.json()[0]["id"]

    r = api_client.post(
        f"/api/chores/{chore_id}/complete",
        params={"child_id": child_id},
        json={},
        headers=headers,
    )
    assert r.status_code == 200, r.text

    r = api_client.post(
        f"/api/chores/{chore_id}/approve",
        json={"rating": 5},
        headers=headers,
    )
    assert r.status_code == 200, r.text

    r = api_client.get(f"/api/children/{child_id}", headers=headers)
    assert r.status_code == 200, r.text
    assert pytest.approx(r.json()["balance"], rel=1e-6) == 10.0

    r = api_client.get("/api/payments", headers=headers)
    assert r.status_code == 200, r.text
    payments_before = r.json()
    assert len(payments_before) >= 1
    assert any(p.get("chore_id") == chore_id and p.get("amount") == 10.0 for p in payments_before)

    r = api_client.post(f"/api/chores/{chore_id}/reset", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pendiente"

    r = api_client.get(f"/api/children/{child_id}", headers=headers)
    assert r.status_code == 200, r.text
    assert pytest.approx(r.json()["balance"], rel=1e-6) == 0.0

    r = api_client.get("/api/payments", headers=headers)
    assert r.status_code == 200, r.text
    assert not any(p.get("chore_id") == chore_id for p in r.json())


def test_reset_rejected_chore_does_not_touch_balance(api_client: TestClient):
    """Reject path never paid — reset should leave balance at 0."""
    email = f"r{uuid.uuid4().hex[:16]}@example.com"
    password = "test-secret-123"
    headers: dict[str, str] = {}

    r = api_client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Parent B"},
    )
    assert r.status_code == 200, r.text
    headers["Authorization"] = f"Bearer {r.json()['access_token']}"

    r = api_client.post(
        "/api/families",
        json={"name": "Fam B", "currency": "EUR", "country_code": "ES"},
        headers=headers,
    )
    assert r.status_code == 200, r.text

    r = api_client.post("/api/children", json={"name": "Kid B", "age": 9}, headers=headers)
    assert r.status_code == 200, r.text
    child_id = r.json()["id"]

    r = api_client.post(
        "/api/chores",
        json={
            "title": "Mop",
            "amount": 5.0,
            "frequency": "unica",
            "assigned_to": [child_id],
        },
        headers=headers,
    )
    chore_id = r.json()[0]["id"]

    r = api_client.post(
        f"/api/chores/{chore_id}/complete",
        params={"child_id": child_id},
        json={},
        headers=headers,
    )
    assert r.status_code == 200, r.text

    r = api_client.post(f"/api/chores/{chore_id}/reject", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "rechazada"

    r = api_client.get(f"/api/children/{child_id}", headers=headers)
    assert pytest.approx(r.json()["balance"], rel=1e-6) == 0.0

    r = api_client.post(f"/api/chores/{chore_id}/reset", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pendiente"

    r = api_client.get(f"/api/children/{child_id}", headers=headers)
    assert pytest.approx(r.json()["balance"], rel=1e-6) == 0.0
