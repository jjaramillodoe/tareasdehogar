"""Send Expo push notifications for stored device tokens."""

from __future__ import annotations

import logging
from typing import Any, Iterable, List, Optional

import httpx

from app.config import db

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Notification types that should alert parents (even when child_id is set as context).
PARENT_PUSH_TYPES = {
    "withdrawal_request",
    "task_completed",
    "chore_completed",
    "goal_completed_bonus",
    "savings_streak",
    "savings_goal_proposed",
}

# Notification types that should alert the child.
CHILD_PUSH_TYPES = {
    "task_approved",
    "task_rejected",
    "savings_match",
    "savings_streak_bonus",
    "savings_goal_completed",
    "savings_goal_milestone",
    "savings_goal_created",
    "savings_goal_rejected",
    "achievement",
    "goal_bonus",
}


def _collect_tokens(docs: Iterable[dict]) -> List[str]:
    tokens: List[str] = []
    seen: set[str] = set()
    for doc in docs:
        for entry in doc.get("push_tokens") or []:
            token = (entry.get("token") if isinstance(entry, dict) else None) or ""
            token = str(token).strip()
            if not token or token in seen:
                continue
            if not (
                token.startswith("ExponentPushToken[")
                or token.startswith("ExpoPushToken[")
            ):
                continue
            seen.add(token)
            tokens.append(token)
    return tokens


async def _tokens_for_parents(family_id: str) -> List[str]:
    parents = await db.users.find({"family_id": family_id}).to_list(50)
    return _collect_tokens(parents)


async def _tokens_for_child(child_id: str) -> List[str]:
    child = await db.children.find_one({"id": child_id})
    if not child:
        return []
    return _collect_tokens([child])


async def send_expo_push(
    *,
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict[str, Any]] = None,
) -> None:
    if not tokens:
        return
    messages = [
        {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }
        for token in tokens
    ]
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            # Expo accepts batches of up to 100
            for i in range(0, len(messages), 100):
                chunk = messages[i : i + 100]
                resp = await client.post(EXPO_PUSH_URL, json=chunk)
                if resp.status_code >= 400:
                    logger.warning("Expo push failed: %s %s", resp.status_code, resp.text[:300])
    except Exception:
        logger.exception("Expo push request error")


async def push_for_notification(
    *,
    family_id: str,
    notif_type: str,
    title: str,
    message: str,
    child_id: Optional[str] = None,
) -> None:
    tokens: List[str] = []
    if notif_type in PARENT_PUSH_TYPES or (
        notif_type not in CHILD_PUSH_TYPES and not child_id
    ):
        tokens.extend(await _tokens_for_parents(family_id))
    if notif_type in CHILD_PUSH_TYPES and child_id:
        tokens.extend(await _tokens_for_child(child_id))
    # Fallback: if typed neither way but has child_id, notify child; else parents
    if not tokens:
        if child_id:
            tokens.extend(await _tokens_for_child(child_id))
        else:
            tokens.extend(await _tokens_for_parents(family_id))

    await send_expo_push(
        tokens=tokens,
        title=title,
        body=message,
        data={"type": notif_type, "child_id": child_id},
    )
