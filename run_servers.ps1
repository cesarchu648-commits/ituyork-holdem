# run_servers.ps1
Write-Host 'Cerrando procesos anteriores de Node...' -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host 'Iniciando Backend...' -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd backend; node server.js`""

Write-Host 'Iniciando Frontend...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; npm run dev`""

Write-Host '¡Servidores Iniciados Exitosamente en nuevas ventanas!' -ForegroundColor Magenta





