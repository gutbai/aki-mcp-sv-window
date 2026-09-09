@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Aki MCP Server

echo [Aki] Working directory: %CD%

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [Aki] ERROR: Node.js is not installed or not in PATH.
  echo [Aki] Required version: Node.js 22.14.0.
  echo.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [Aki] ERROR: npm.cmd was not found in PATH.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\@modelcontextprotocol\sdk" (
  echo [Aki] Dependencies not found. Running npm ci...
  call npm.cmd ci
  if errorlevel 1 (
    echo.
    echo [Aki] ERROR: npm ci failed.
    pause
    exit /b 1
  )
)

echo [Aki] Starting server...
echo [Aki] Logs: %USERPROFILE%\.aki\mcpsv\logs
echo.
call npm.cmd start
set "AKI_EXIT=%ERRORLEVEL%"

echo.
echo [Aki] Server exited with code %AKI_EXIT%.
pause
exit /b %AKI_EXIT%
