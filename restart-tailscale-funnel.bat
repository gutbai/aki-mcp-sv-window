@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Restart Tailscale Funnel - Aki MCP

net session >nul 2>&1
if errorlevel 1 (
  echo [Aki] Administrator rights are required. Re-opening as Administrator...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

where tailscale.exe >nul 2>&1
if errorlevel 1 (
  echo [Aki] ERROR: tailscale.exe not found in PATH.
  pause
  exit /b 1
)

echo [Aki] Resetting Tailscale Funnel...
tailscale funnel reset
if errorlevel 1 goto :fail

echo [Aki] Restarting Tailscale service...
net stop Tailscale
if errorlevel 1 goto :fail
net start Tailscale
if errorlevel 1 goto :fail

echo [Aki] Re-enabling Funnel on local port 9999...
tailscale funnel --bg 9999
if errorlevel 1 goto :fail

echo.
echo [Aki] Current Funnel status:
tailscale funnel status
if errorlevel 1 goto :fail

echo.
echo [Aki] Done.
pause
exit /b 0

:fail
echo.
echo [Aki] ERROR: restart sequence failed. Review the command output above.
pause
exit /b 1
