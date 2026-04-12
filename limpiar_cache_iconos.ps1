# Limpiar caché de íconos de Windows y refrescar acceso directo

Write-Host "Deteniendo Explorer..." -ForegroundColor Yellow
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 800

# Borrar archivos de caché de íconos
$explorerCache = "$env:LOCALAPPDATA\Microsoft\Windows\Explorer"
Get-ChildItem -Path $explorerCache -Filter "iconcache*" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $explorerCache -Filter "thumbcache*" -ErrorAction SilentlyContinue | Remove-Item -Force
Write-Host "Cache borrada." -ForegroundColor Green

# Volver a crear el acceso directo con el nuevo ícono
$bat = Join-Path $PSScriptRoot "START_AMORI.bat"
$ico = Join-Path $PSScriptRoot "amori.ico"
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = Join-Path $desktop "Amori.lnk"

$wsh = New-Object -ComObject WScript.Shell
$lnk = $wsh.CreateShortcut($shortcut)
$lnk.TargetPath = $bat
$lnk.WorkingDirectory = $PSScriptRoot
$lnk.Description = "Iniciar Amori - Lector de libros con IA"
$lnk.WindowStyle = 1
$lnk.IconLocation = $ico
$lnk.Save()
Write-Host "Acceso directo recreado." -ForegroundColor Green

# Reiniciar Explorer
Start-Process explorer
Write-Host "Explorer reiniciado. El icono deberia actualizarse ahora." -ForegroundColor Cyan
