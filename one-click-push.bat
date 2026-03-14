@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0one-click-push.ps1" %*
exit /b %errorlevel%
