@echo off
title FixMate Core Backend Server
cd /d "%~dp0"
echo ========================================================
echo         FixMate Local Next.js Server (0.0.0.0:3000)
echo ========================================================
echo.

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Port 3000 is already in use by a background process.
    echo Resetting port 3000 for a fresh clean start...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%p >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
    echo Port 3000 is now free.
)

echo Active Local IPv4: 192.168.1.2
echo   - PC Browser: http://localhost:3000
echo   - Phone:      http://192.168.1.2:3000
echo.
echo Note: Ensure phone and PC are on the same Wi-Fi network.
echo Your browser will open automatically once the server is ready.
echo ========================================================
echo.
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"
call npm.cmd run dev
pause
