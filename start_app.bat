@echo off
echo Starting Amori...

:: Start Backend
cd /d "%~dp0backend"
start "Amori Backend" /MIN python main.py

:: Start Frontend
cd /d "%~dp0frontend"
start "Amori Frontend" /MIN npm run dev

:: Wait a moment for servers to spin up
timeout /t 5 >nul

:: Open Browser
start http://localhost:5173

echo.
echo Amori is running!
echo You can close this window, but keep the Backend and Frontend windows open.
pause
