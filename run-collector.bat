@echo off
rem TaskForge Collector launcher (Windows): installs dependencies on first run, then builds and starts the app.
rem Requires Node.js 20+ (https://nodejs.org). Preconfigured for the hosted demo server; see README "For judges".
cd /d "%~dp0collector"
where npm >nul 2>nul || (echo Node.js is not installed. Install it from https://nodejs.org and run this file again. & pause & exit /b 1)
if not exist node_modules (
  echo Installing dependencies, first run only...
  call npm install || (echo npm install failed. & pause & exit /b 1)
)
call npm start
if errorlevel 1 pause
