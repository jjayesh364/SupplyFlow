"""Main FastAPI application entry point for SupplyFlow."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events management for startup and shutdown."""
    # Startup: Print configuration verification
    print(f"[STARTUP] SupplyFlow API v{settings.VERSION} initializing...")
    print(f"[STARTUP] Theater: {settings.DEMO_THEATER_LABEL}")
    print(f"[STARTUP] Environment: {settings.ENVIRONMENT}")
    yield
    # Shutdown
    print("[SHUTDOWN] SupplyFlow API shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        f"**SIH 2026 Problem Statement PS 26251** — Predictive Logistics & Forward Supply Chain.\n\n"
        f"**CRITICAL NOTICE:** {settings.DEMO_THEATER_LABEL}.\n"
        f"All inventory counts, demand forecasts, vehicle dispatches, and routes are "
        f"strictly synthetic simulation data."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    """Root metadata endpoint."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "demonstration_theater": settings.DEMO_THEATER_LABEL,
        "synthetic_data_only": settings.IS_SYNTHETIC_DATA_ONLY,
        "api_v1_docs": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
    }
