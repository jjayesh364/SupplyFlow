@echo off
setlocal EnableExtensions EnableDelayedExpansion
title SupplyFlow Stopper
color 0C

cd /d "%~dp0"
set "ROOT=%~dp0"
set "PG_BIN=%ROOT%pgsql\bin"
set "PG_DATA=%ROOT%data\pgdata"

echo =============================================
echo        SUPPLYFLOW -- STOP SERVICES
echo =============================================
echo.

:: 1. Stop SupplyFlow Backend
echo Stopping SupplyFlow Backend [port 8000]...
taskkill /FI "WINDOWTITLE eq SupplyFlow - Backend*" /T /F >nul 2>&1
powershell -NoProfile -Command ^
  "$port = 8000; " ^
  "Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { " ^
  "  $pId = $_.OwningProcess; " ^
  "  $proc = Get-Process -Id $pId -ErrorAction SilentlyContinue; " ^
  "  $cim = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $pId) -ErrorAction SilentlyContinue; " ^
  "  if ($cim -and ($cim.CommandLine -like '*SupplyFlow*' -or $cim.CommandLine -like '*services\api*')) { " ^
  "    Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue; " ^
  "    Write-Host ('[OK] Terminated SupplyFlow backend process (PID ' + $pId + ')'); " ^
  "  } " ^
  "}"
echo [OK] Backend stopped.

:: 2. Stop SupplyFlow Frontend
echo.
echo Stopping SupplyFlow Frontend [port 3000]...
taskkill /FI "WINDOWTITLE eq SupplyFlow - Frontend*" /T /F >nul 2>&1
powershell -NoProfile -Command ^
  "$port = 3000; " ^
  "Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { " ^
  "  $pId = $_.OwningProcess; " ^
  "  $proc = Get-Process -Id $pId -ErrorAction SilentlyContinue; " ^
  "  $cim = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $pId) -ErrorAction SilentlyContinue; " ^
  "  if ($cim -and ($cim.CommandLine -like '*SupplyFlow*' -or $cim.CommandLine -like '*apps\web*')) { " ^
  "    Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue; " ^
  "    Write-Host ('[OK] Terminated SupplyFlow frontend process (PID ' + $pId + ')'); " ^
  "  } " ^
  "}"
echo [OK] Frontend stopped.

:: 3. PostgreSQL handling
echo.
set "STOP_DB=0"
if "%~1"=="--with-db" set "STOP_DB=1"
if "%~1"=="-db" set "STOP_DB=1"
if "%~1"=="/db" set "STOP_DB=1"

if "%STOP_DB%"=="1" (
    echo Stopping local PostgreSQL server...
    if exist "%PG_BIN%\pg_ctl.exe" if exist "%PG_DATA%" (
        "%PG_BIN%\pg_ctl.exe" stop -D "%PG_DATA%" -m fast
        echo [OK] PostgreSQL server stopped.
    ) else (
        echo [WARN] pg_ctl or data\pgdata not found.
    )
) else (
    echo [INFO] PostgreSQL on port 5433 was left active for fast restarts.
    echo        [To also shut down PostgreSQL, run: stop-windows.bat --with-db]
)

echo.
echo =============================================
echo  SUPPLYFLOW SERVICES STOPPED
echo =============================================
echo.
ping -n 4 127.0.0.1 >nul
exit /b 0
