@echo off
chcp 65001 >nul
title Certificate System - Launcher

set "ROOT=%~dp0"
set "BACKEND=%~dp0backend"
set "FRONTEND=%~dp0"

echo ================================================
echo    Certificate System - Full Stack Launcher
echo ================================================
echo.

:: Step 1: Start MongoDB
echo [1/3] Starting MongoDB...
start "MongoDB" "D:\mongodb\mongodb-win32-x86_64-windows-7.0.8\bin\mongod.exe" --dbpath "D:\mongodb\data\db" --port 27017
ping 127.0.0.1 -n 4 >nul
echo      MongoDB OK on port 27017

:: Step 2: Start Backend
echo [2/3] Starting Backend...
cd /d "%BACKEND%"
start "Backend Server" cmd /k npm run dev
ping 127.0.0.1 -n 4 >nul
echo      Backend OK on port 5000

:: Step 3: Start Frontend
echo [3/3] Starting Frontend...
cd /d "%FRONTEND%"
start "Frontend Client" cmd /k npm run dev
ping 127.0.0.1 -n 5 >nul
echo      Frontend OK on port 5173

echo.
echo ================================================
echo   Open: http://localhost:5173
echo   Username: shimaa  /  Password: Sekoseko2468
echo ================================================
echo.

start "" "http://localhost:5173"
pause
