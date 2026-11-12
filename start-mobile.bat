@echo off
title FixMate Mobile Bundler (Metro / Expo)
cd /d "%~dp0mobile"
echo ========================================================
echo           FixMate Mobile Bundler (Metro / Expo)
echo ========================================================
echo.

netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Metro port 8081 is already in use.
    echo Resetting port 8081 for a fresh start...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%p >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
)

echo Starting Expo Metro Bundler in LAN mode...
echo Connect your phone via Expo Go on Wi-Fi (10.210.244.81)!
echo.
call npx.cmd expo start -c --lan
pause
