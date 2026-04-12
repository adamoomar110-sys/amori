@echo off
title Amori v2.0
echo ============================================================
echo   Iniciando Amori...
echo ============================================================

:: Ir a la carpeta raiz de amori (donde esta este .bat)
cd /d "%~dp0"

:: Verificar que start_app.py existe
if not exist "start_app.py" (
    echo.
    echo ERROR: No se encontro start_app.py en %~dp0
    pause
    exit /b 1
)

:: Compilar frontend si no existe el dist
if not exist "frontend\dist\index.html" (
    echo.
    echo Frontend no compilado. Compilando...
    echo Esto solo ocurre la primera vez, un momento...
    echo.
    cmd /c "cd frontend && npm install && npm run build"
    if errorlevel 1 (
        echo ERROR al compilar el frontend. Verifica que Node.js este instalado.
        pause
        exit /b 1
    )
    echo Frontend compilado correctamente!
    echo.
)

:: Matar procesos viejos si quedaron colgados
echo Limpiando procesos anteriores...
taskkill /f /im python.exe >nul 2>&1

:: Usar el venv si existe, sino Python del sistema
echo Arrancando servidor...
if exist "backend\venv\Scripts\python.exe" (
    backend\venv\Scripts\python.exe start_app.py
) else (
    echo Advertencia: venv no encontrado. Usando Python del sistema...
    python start_app.py
)

pause
