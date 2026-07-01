@echo off
cd /d C:\projects\rentcrm2
setlocal
chcp 65001 >nul

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js не найден.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm не найден.
  pause
  exit /b 1
)

netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo Порт 5432 уже занят. Возможно, SSH-туннель уже запущен.
) else (
  start "CRM DB Tunnel" cmd /k "ssh -L 5432:127.0.0.1:5432 root@31.129.102.131"
  timeout /t 5 /nobreak >nul
)

netstat -ano | findstr /R /C:":3002 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo Порт 3002 уже занят. Возможно, CRM уже запущена.
  start "" "http://localhost:3002/admin/bookings"
  exit /b 0
)

start "Octavia Rent CRM Server" /D "C:\projects\rentcrm2" cmd /k "npm run dev -- -p 3002"

timeout /t 5 /nobreak >nul
start "" "http://localhost:3002/admin/bookings"

echo CRM запускается. Для работы не закрывайте окна CRM DB Tunnel и Octavia Rent CRM Server.
exit /b 0
