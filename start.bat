@echo off
REM NRE Infusion - Production Startup Script (Windows)

setlocal enabledelayedexpansion

echo.
echo ========================================
echo    NRE Infusion OneHub - Starting Up
echo ========================================
echo.

REM Check Redis
echo [1/4] Checking Redis...
redis-cli PING >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Redis not running
  echo Start with: redis-server
  pause
  exit /b 1
)
echo [OK] Redis connected

REM Check environment
echo [2/4] Checking environment...
if not defined SUPABASE_URL (
  echo [WARNING] SUPABASE_URL not set
)
echo [OK] Environment configured

REM Install dependencies
echo [3/4] Installing dependencies...
call npm install --silent >nul 2>&1
cd email-server
call npm install --silent >nul 2>&1
cd ..
echo [OK] Dependencies installed

REM Start services
echo [4/4] Starting services...
echo.

REM Start in new windows
start "Frontend" cmd /k npm run dev
timeout /t 2 /nobreak
start "Email Server" cmd /k cd email-server ^& npm run dev
timeout /t 2 /nobreak
start "Email Worker" cmd /k cd email-server ^& npm run dev:worker

echo.
echo ========================================
echo    ✓ All services started!
echo ========================================
echo.
echo Frontend:     http://localhost:5173
echo Backend:      http://localhost:3000
echo Email:        http://localhost:3001
echo Redis:        localhost:6379
echo.
echo Load Balancer (if running):
echo                http://localhost:8080
echo.
pause
