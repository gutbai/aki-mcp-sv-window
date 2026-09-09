@echo off
setlocal EnableExtensions
set "AKI_LOG_DIR=%USERPROFILE%\.aki\mcpsv\logs"
title Aki MCP Logs

powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -Command "$d=$env:AKI_LOG_DIR; if (!(Test-Path $d)) { Write-Host '[Aki] No log directory yet:' $d; return }; $f=Get-ChildItem -Path $d -Filter 'aki-*.jsonl' | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if (!$f) { Write-Host '[Aki] No log file yet in' $d; return }; Write-Host '[Aki] Live log:' $f.FullName; Write-Host 'Ctrl+C stops tailing.'; Get-Content -Path $f.FullName -Tail 200 -Wait"
