@echo off
title FixMate - Build Standalone Android APK
cd /d "%~dp0"
echo ========================================================
echo          FixMate Mobile - Build Standalone APK
echo ========================================================
echo.
echo This will package FixMate Mobile into a standalone .APK file
echo that can be directly installed on any physical Android device.
echo.
echo Requirements: Free Expo / EAS account (sign in if prompted).
echo.
pause
echo Starting EAS build for Android APK...
call npx.cmd eas-cli build -p android --profile preview
echo.
pause
