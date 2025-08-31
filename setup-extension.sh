#!/bin/bash

# Sybil VS Code Extension Setup Script
# This script automates the setup process for the Sybil VS Code extension

set -e  # Exit on any error

echo "🚀 Sybil VS Code Extension Setup"
echo "================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. You have $(node --version)"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ npm $(npm --version)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d'.' -f2)
if [ "$PYTHON_VERSION" -lt 8 ]; then
    echo "❌ Python 3.8+ is required. You have $(python3 --version)"
    exit 1
fi
echo "✅ Python $(python3 --version)"

# Check git
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed."
    exit 1
fi
echo "✅ Git $(git --version)"

echo ""

# Setup Python backend
echo "🐍 Setting up Python backend..."
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt not found. Please run this script from the sybil root directory."
    exit 1
fi

echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if config.yaml exists
if [ ! -f "config.yaml" ]; then
    echo "📝 Creating config.yaml from example..."
    cp config.yaml.example config.yaml
    echo "⚠️  Please edit config.yaml and add your API keys before using the extension."
else
    echo "✅ config.yaml already exists"
fi

echo ""

# Setup VS Code extension
echo "🔧 Setting up VS Code extension..."
cd ext

echo "Installing Node.js dependencies..."
npm install

echo "Compiling TypeScript..."
npm run compile

# Verify compilation
if [ ! -f "out/extension.js" ]; then
    echo "❌ Compilation failed. Check for TypeScript errors."
    exit 1
fi

echo "✅ Extension compiled successfully"

echo ""

# Final instructions
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit config.yaml and add your API keys"
echo "2. Open the 'ext' folder in VS Code"
echo "3. Press F5 to launch the extension development host"
echo "4. Test the extension in the new VS Code window"
echo ""
echo "📚 For detailed instructions, see ext/README.md"
echo ""
echo "🔍 Quick test:"
echo "   - Open Command Palette (Ctrl+Shift+P)"
echo "   - Run 'Sybil: Start New Task'"
echo "   - Check 'Sybil Agent' output channel for logs"
