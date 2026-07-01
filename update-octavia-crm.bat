@echo off
cd /d C:\projects\rentcrm2
setlocal
chcp 65001 >nul

where git >nul 2>nul
if errorlevel 1 (
  echo Git не найден. Установите Git или обновите проект вручную.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm не найден. Проверьте установку Node.js и повторите обновление.
  pause
  exit /b 1
)

echo Загружаем обновления...
call git pull
if errorlevel 1 (
  echo Ошибка git pull. Обновление остановлено.
  pause
  exit /b 1
)

echo Устанавливаем зависимости...
call npm install
if errorlevel 1 (
  echo Ошибка npm install. Обновление остановлено.
  pause
  exit /b 1
)

echo Собираем CRM...
call npm run build:local
if errorlevel 1 (
  echo Ошибка сборки CRM. Обновление остановлено.
  pause
  exit /b 1
)

echo Обновление завершено. Теперь можно запустить start-octavia-crm.bat
pause
exit /b 0
