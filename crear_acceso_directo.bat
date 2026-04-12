@echo off
title Creando acceso directo de Amori...
echo ============================================================
echo   Creando acceso directo de Amori en el Escritorio...
echo ============================================================

:: Usar PowerShell para crear el shortcut con la ruta correcta
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$bat = '%~dp0START_AMORI.bat';" ^
  "$desktop = [Environment]::GetFolderPath('Desktop');" ^
  "$shortcut = Join-Path $desktop 'Amori.lnk';" ^
  "$wsh = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $wsh.CreateShortcut($shortcut);" ^
  "$lnk.TargetPath = $bat;" ^
  "$lnk.WorkingDirectory = '%~dp0';" ^
  "$lnk.Description = 'Iniciar Amori - Lector de libros con IA';" ^
  "$lnk.WindowStyle = 1;" ^
  "if (Test-Path '%~dp0amori.ico') { $lnk.IconLocation = '%~dp0amori.ico' };" ^
  "$lnk.Save();" ^
  "Write-Host 'Acceso directo creado en: ' + $shortcut"

echo.
echo Listo! Busca el icono "Amori" en tu escritorio.
echo.
pause
