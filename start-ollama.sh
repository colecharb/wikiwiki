#!/bin/bash

# Ollama startup helper script for macOS

echo "======================================================"
echo "  Wikipedia Path Finder - Ollama Startup Helper"
echo "======================================================"
echo ""

# Check if Ollama is already running
echo "Checking if Ollama is running..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is already running!"
else
    echo "❌ Ollama is not running. Starting..."
    echo ""
    echo "Starting: ollama serve"
    echo "This may take a moment..."
    echo ""
    
    # Try to start Ollama
    if command -v ollama &> /dev/null; then
        ollama serve
    else
        echo "Error: Ollama not found in PATH"
        echo ""
        echo "Please install Ollama from: https://ollama.ai"
        echo "Or check that Ollama is installed correctly"
        exit 1
    fi
fi
