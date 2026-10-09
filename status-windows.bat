@echo off
setlocal EnableExtensions EnableDelayedExpansion
title SupplyFlow Status
color 0E

cd /d "%~dp0"
set "ROOT=%~dp0"
set "PG_BIN=%ROOT%pgsql\bin"
set "DB_PORT=5433"

echo =============================================
echo        SUPPLYFLOW -- SERVICE STATUS
echo =============================================
echo.

:: 1. Check PostgreSQL
if exist "%PG_BIN%\pg_isready.exe" (
    "%PG_BIN%\pg_isready.exe" -h localhost -p %DB_PORT% -U postgres -d supplyflow >nul 2>&1
    if !errorlevel!==0 (
        echo [ONLINE]  PostgreSQL / PostGIS [port %DB_PORT% - accepting connections]
        goto CHECK_BACKEND
    )
)

powershell -NoProfile -Command "try { $t = New-Object System.Net.Sockets.TcpClient('localhost', %DB_PORT%); $t.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if !errorlevel!==0 (
    echo [ONLINE]  PostgreSQL / PostGIS [port %DB_PORT% - accepting connections]
) else (
    echo [OFFLINE] PostgreSQL / PostGIS [port %DB_PORT% - unreachable]
)

:CHECK_BACKEND
:: 2. Check Backend
curl.exe -s -f http://localhost:8000/api/v1/ping >nul 2>&1
if !errorlevel!==0 (
    echo [ONLINE]  FastAPI Backend [http://localhost:8000 - health OK]
) else (
    echo [OFFLINE] FastAPI Backend [http://localhost:8000 - not responding]
)

:: 3. Check Frontend
curl.exe -s -f http://localhost:3000 >nul 2>&1
if !errorlevel!==0 (
    echo [ONLINE]  Next.js Frontend [http://localhost:3000 - operational]
) else (
    echo [OFFLINE] Next.js Frontend [http://localhost:3000 - not responding]
)

echo.
echo =============================================
echo  Useful Links:
echo    Dashboard: http://localhost:3000
echo    API Docs:  http://localhost:8000/docs
echo =============================================
echo.
pause
