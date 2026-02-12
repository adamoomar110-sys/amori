@echo off
echo Redirecting to Amori v1.6...
cd /d "%~dp0amori"
if exist "start_app.bat" (
    call start_app.bat
) else (
    echo Error: amori/start_app.bat not found!
    pause
)

