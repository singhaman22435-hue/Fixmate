@echo off
title FixMate Mobile Bundler (Metro / Expo)
cd /d "e:\New folder (4)\mobile"
echo ========================================================
echo           FixMate Mobile Bundler (Metro / Expo)
echo ========================================================
echo.
echo Starting Expo Metro Bundler in LAN mode...
echo.
call npx.cmd expo start -c --lan
pause
