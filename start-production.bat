@echo off
title FixMate - Production Server
cd /d "%~dp0"
echo ========================================================
echo                 FixMate Production Server
echo          Offline-First Personal Problem Solver
echo ========================================================
echo.
echo Active Local IPv4: 10.210.244.81
echo   - PC Browser: http://localhost:3000
echo   - Phone:      http://10.210.244.81:3000
echo.
echo Starting FixMate production server...
echo Your browser will open automatically once the server is ready.
echo (Press Ctrl+C in this window to stop)
echo ========================================================
echo.
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
call npm.cmd start
pause
