@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Reset ChatGPT OAuth - Aki MCP

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [Aki] ERROR: node.exe not found in PATH.
  pause
  exit /b 1
)

node.exe .\scripts\reset-chatgpt-oauth.js
echo.
pause
