@echo off
echo ==========================================
echo    PeerFlix Public Access Setup
echo ==========================================
echo.

:: Check if ngrok is installed
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ngrok is not installed!
    echo.
    echo Please install ngrok first:
    echo   1. Go to https://ngrok.com/download
    echo   2. Download and extract ngrok.exe
    echo   3. Add ngrok to your PATH or place it in this folder
    echo   4. Run: ngrok config add-authtoken YOUR_AUTH_TOKEN
    echo.
    echo After installing, run this script again.
    pause
    exit /b 1
)

echo [INFO] Starting ngrok tunnels for PeerFlix...
echo.
echo This will expose:
echo   - Frontend (port 5000) 
echo   - Backend  (port 3000)
echo.
echo Make sure both servers are running first!
echo.

:: Start ngrok with the config file
ngrok start --config ngrok.yml --all

pause
