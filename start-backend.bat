@echo off
title FixMate Core Backend Server
cd /d "%~dp0"
echo ========================================================
echo         FixMate Local Next.js Server (0.0.0.0:3000)
echo ========================================================
echo.
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
