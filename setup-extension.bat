@echo off
REM Sybil VS Code Extension Setup Script (Windows)
REM This script automates the setup process for the Sybil VS Code extension

echo 🚀 Sybil VS Code Extension Setup
echo =================================

REM Check prerequisites
echo 📋 Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=2 delims=v." %%a in ('node --version') do set NODE_MAJOR=%%a
if %NODE_MAJOR% lss 18 (
    echo ❌ Node.js version 18+ is required. You have:
    node --version
    pause
    exit /b 1
)
echo ✅ Node.js:
node --version

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed.
    pause
    exit /b 1
)
echo ✅ npm:
npm --version

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Python 3 is not installed.
        pause
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)

for /f "tokens=2 delims=." %%a in ('%PYTHON_CMD% --version 2>&1') do set PYTHON_MAJOR=%%a
if %PYTHON_MAJOR% lss 8 (
    echo ❌ Python 3.8+ is required. You have:
    %PYTHON_CMD% --version
    pause
    exit /b 1
)
echo ✅ Python:
%PYTHON_CMD% --version

REM Check git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed.
    pause
    exit /b 1
)
echo ✅ Git:
git --version

echo.

REM Setup Python backend
echo 🐍 Setting up Python backend...
if not exist "requirements.txt" (
    echo ❌ requirements.txt not found. Please run this script from the sybil root directory.
    pause
    exit /b 1
)

echo Installing Python dependencies...
pip install -r requirements.txt

REM Check if config.yaml exists
if not exist "config.yaml" (
    echo 📝 Creating config.yaml from example...
    copy config.yaml.example config.yaml
    echo ⚠️  Please edit config.yaml and add your API keys before using the extension.
) else (
    echo ✅ config.yaml already exists
)

echo.

REM Setup VS Code extension
echo 🔧 Setting up VS Code extension...
if not exist "ext" (
    echo ❌ ext directory not found. Please run this script from the sybil root directory.
    pause
    exit /b 1
)

cd ext

echo Installing Node.js dependencies...
npm install

echo Compiling TypeScript...
npm run compile

REM Verify compilation
if not exist "out\extension.js" (
    echo ❌ Compilation failed. Check for TypeScript errors.
    cd ..
    pause
    exit /b 1
)

echo ✅ Extension compiled successfully

cd ..

echo.

REM Final instructions
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. Edit config.yaml and add your API keys
echo 2. Open the 'ext' folder in VS Code
echo 3. Press F5 to launch the extension development host
echo 4. Test the extension in the new VS Code window
echo.
echo 📚 For detailed instructions, see ext/README.md
echo.
echo 🔍 Quick test:
echo    - Open Command Palette (Ctrl+Shift+P)
echo    - Run 'Sybil: Start New Task'
echo    - Check 'Sybil Agent' output channel for logs

pause
