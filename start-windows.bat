
@echo off
setlocal EnableExtensions EnableDelayedExpansion
title SupplyFlow Launcher
color 0B

cd /d "%~dp0"
set "ROOT=%~dp0"
set "BACKEND=%ROOT%services\api"
set "FRONTEND=%ROOT%apps\web"
set "VENV=%ROOT%.venv"
set "VENV_PYTHON=%VENV%\Scripts\python.exe"
set "PG_BIN=%ROOT%pgsql\bin"
set "PG_DATA=%ROOT%data\pgdata"
set "DB_HOST=localhost"
set "DB_PORT=5433"
set "DB_NAME=supplyflow"
set "DB_USER=postgres"
set "NPM_CMD=C:\Users\HP\AppData\Local\Author Software\nvm\installs\v22.23.3\npm.cmd"

echo =============================================
echo        SUPPLYFLOW -- DEVELOPMENT STARTUP
echo    Predictive Logistics ^& Forward Supply Chain
echo =============================================
echo.

:: [1/5] Checking environment
echo [1/5] Checking environment...

if not exist "%BACKEND%" (
    echo [ERROR] Backend directory not found: "%BACKEND%"
    pause
    exit /b 1
)

if not exist "%FRONTEND%" (
    echo [ERROR] Frontend directory not found: "%FRONTEND%"
    pause
    exit /b 1
)

if not exist "%VENV_PYTHON%" (
    echo [ERROR] Python virtual environment not found.
    echo Expected: "%VENV_PYTHON%"
    pause
    exit /b 1
)

echo [OK] Python environment found:
"%VENV_PYTHON%" --version

if not exist "%NPM_CMD%" (
    echo [ERROR] npm.cmd not found: "%NPM_CMD%"
    pause
    exit /b 1
)

call "%NPM_CMD%" --version
if errorlevel 1 (
    echo [ERROR] npm.cmd could not run.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found on PATH.
    pause
    exit /b 1
)

echo [OK] Node.js and npm environment found

:: [2/5] Checking PostgreSQL/PostGIS
echo.
echo [2/5] Checking PostgreSQL/PostGIS...

set "DB_ONLINE=0"

if exist "%PG_BIN%\pg_isready.exe" (
    "%PG_BIN%\pg_isready.exe" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% >nul 2>&1
    if !errorlevel!==0 set "DB_ONLINE=1"
) else (
    powershell -NoProfile -Command "try { $t = New-Object System.Net.Sockets.TcpClient('%DB_HOST%', %DB_PORT%); $t.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if !errorlevel!==0 set "DB_ONLINE=1"
)

if "%DB_ONLINE%"=="1" (
    echo [OK] PostgreSQL already running [port %DB_PORT%]
    goto DB_DONE
)

echo Starting PostgreSQL on port %DB_PORT%...

if exist "%PG_BIN%\pg_ctl.exe" if exist "%PG_DATA%" (
    "%PG_BIN%\pg_ctl.exe" start -D "%PG_DATA%" -l "%PG_DATA%\logfile.log"
    goto DB_WAIT
)

where docker >nul 2>&1
if not errorlevel 1 (
    echo Starting PostgreSQL using Docker Compose...
    docker compose up -d db
    if errorlevel 1 (
        echo [ERROR] Docker Compose failed to start the database.
        pause
        exit /b 1
    )
    goto DB_WAIT
)

echo [ERROR] Could not start PostgreSQL.
echo Local database files or Docker Compose were not found.
pause
exit /b 1

:DB_WAIT
echo Waiting for PostgreSQL...
set /a DB_ATTEMPTS=0
set /a DB_MAX_ATTEMPTS=30

:DB_WAIT_LOOP
if exist "%PG_BIN%\pg_isready.exe" (
    "%PG_BIN%\pg_isready.exe" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% >nul 2>&1
    if !errorlevel!==0 goto DB_READY
) else (
    powershell -NoProfile -Command "try { $t = New-Object System.Net.Sockets.TcpClient('%DB_HOST%', %DB_PORT%); $t.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if !errorlevel!==0 goto DB_READY
)

set /a DB_ATTEMPTS+=1
if !DB_ATTEMPTS! geq !DB_MAX_ATTEMPTS! goto DB_TIMEOUT

<nul set /p=.
ping -n 2 127.0.0.1 >nul
goto DB_WAIT_LOOP

:DB_READY
echo.
echo [OK] PostgreSQL ready
goto DB_DONE

:DB_TIMEOUT
echo.
echo [ERROR] PostgreSQL did not become available within the timeout.
echo Check the database logs and port %DB_PORT%.
pause
exit /b 1

:DB_DONE

:: [3/5] Starting FastAPI Backend
echo.
echo [3/5] Starting FastAPI...

curl.exe -s -f http://localhost:8000/api/v1/ping >nul 2>&1
if not errorlevel 1 (
    echo [OK] Backend already running
    echo       http://localhost:8000
    goto BACKEND_DONE
)

echo Launching FastAPI backend...
start "SupplyFlow - Backend" cmd /k "cd /d ""%BACKEND%"" && ""%VENV_PYTHON%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Waiting for backend health check...
set /a BE_ATTEMPTS=0
set /a BE_MAX_ATTEMPTS=35

:BE_WAIT_LOOP
curl.exe -s -f http://localhost:8000/api/v1/ping >nul 2>&1
if not errorlevel 1 goto BACKEND_READY

set /a BE_ATTEMPTS+=1
if !BE_ATTEMPTS! geq !BE_MAX_ATTEMPTS! goto BE_TIMEOUT

<nul set /p=.
ping -n 2 127.0.0.1 >nul
goto BE_WAIT_LOOP

:BACKEND_READY
echo.
echo [OK] Backend ready: http://localhost:8000
goto BACKEND_DONE

:BE_TIMEOUT
echo.
echo [ERROR] FastAPI did not respond within 35 seconds.
echo Inspect the SupplyFlow - Backend terminal.
pause
exit /b 1

:BACKEND_DONE

:: [4/5] Starting Next.js Frontend
echo.
echo [4/5] Starting Next.js...

curl.exe -s -f http://localhost:3000 >nul 2>&1
if not errorlevel 1 (
    echo [OK] Frontend already running
    echo       http://localhost:3000
    goto FRONTEND_DONE
)

echo Launching Next.js frontend...

start "SupplyFlow - Frontend" powershell.exe -NoExit -Command "Set-Location -LiteralPath 'D:\SupplyFlow\apps\web'; & 'C:\Users\HP\AppData\Local\Author Software\nvm\installs\v22.23.3\npm.cmd' run dev"

echo Waiting for Next.js...
set /a FE_ATTEMPTS=0
set /a FE_MAX_ATTEMPTS=45

:FE_WAIT_LOOP
curl.exe -s -f http://localhost:3000 >nul 2>&1
if not errorlevel 1 goto FE_READY

set /a FE_ATTEMPTS+=1
if !FE_ATTEMPTS! geq !FE_MAX_ATTEMPTS! goto FE_TIMEOUT

<nul set /p=.
ping -n 2 127.0.0.1 >nul
goto FE_WAIT_LOOP

:FE_READY
echo.
echo [OK] Frontend ready: http://localhost:3000
goto FRONTEND_DONE

:FE_TIMEOUT
echo.
echo [ERROR] Next.js did not respond within 45 seconds.
echo Inspect the SupplyFlow - Frontend PowerShell window.
pause
exit /b 1

:FRONTEND_DONE

:: [5/5] Opening SupplyFlow Dashboard
echo.
echo [5/5] Opening SupplyFlow...
start "" "http://localhost:3000"

echo.
echo =============================================
echo  SUPPLYFLOW IS RUNNING
echo =============================================
echo.
echo  Dashboard: http://localhost:3000
echo  API:       http://localhost:8000
echo  API Docs:  http://localhost:8000/docs
echo.
echo  Stop individual services with Ctrl+C.
echo  Or use stop-windows.bat if available.
echo =============================================
echo.
pause
exit /b 0
