"""Optional read-only AI explanations for synthetic SupplyFlow data."""

from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.services.assistant_service import (
    MAX_REQUESTS_PER_MINUTE,
    AssistantUnavailable,
    answer,
    assistant_available,
)

router = APIRouter()
_requests: dict[str, deque[datetime]] = defaultdict(deque)


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    language: Literal["en", "hi", "gu", "mr", "pa", "bn"] = "en"


@router.get("/assistant/status")
async def get_assistant_status() -> dict[str, object]:
    return {
        "available": assistant_available(),
        "language": "en",
        "message": None if assistant_available() else "AI help is unavailable: configure the free Gemini API key on the FastAPI server.",
    }


@router.post("/assistant/ask")
async def ask_assistant(
    payload: AssistantQuestion,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    now = datetime.now(UTC)
    peer = request.client.host if request.client else "unknown"
    bucket = _requests[peer]
    while bucket and bucket[0] < now - timedelta(minutes=1):
        bucket.popleft()
    if len(bucket) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="AI help is temporarily rate-limited. Try again in a minute.")
    bucket.append(now)
    try:
        facts, explanation = await answer(db, payload.question, payload.language)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except AssistantUnavailable as exc:
        return {"available": False, "message": str(exc), "facts": [], "explanation": None}
    return {
        "available": True,
        "facts": facts,
        "explanation": explanation,
        "explanation_label": "AI-generated explanation",
        "synthetic_data": settings.IS_SYNTHETIC_DATA_ONLY,
    }
