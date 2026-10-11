"""Deployment guard for mutation-capable operations in public demos."""

from fastapi import HTTPException, status

from app.core.config import settings


def require_write_actions_enabled() -> None:
    """Reject API operations that persist generated forecasts or recommendations in demo mode."""
    if settings.DEMO_READ_ONLY_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Write actions are disabled for this read-only demonstration deployment.",
        )
