#!/bin/bash

# Prepare Next.js standalone output for Tauri bundling
# Copies the standalone server and static files to Tauri resources

set -e

STANDALONE_DIR=".next/standalone"
STATIC_DIR=".next/static"
PUBLIC_DIR="public"
TAURI_RESOURCES_DIR="tauri/src-tauri/resources"
SERVER_DIR="$TAURI_RESOURCES_DIR/server"

echo "📦 Preparing standalone server for Tauri..."

# Check if standalone build exists
if [ ! -d "$STANDALONE_DIR" ]; then
  echo "❌ Standalone build not found. Run 'npm run build' first."
  exit 1
fi

# Clean previous server directory
rm -rf "$SERVER_DIR"
mkdir -p "$SERVER_DIR"

# Copy standalone server (including hidden files like .next)
echo "📁 Copying standalone server..."
cp -r "$STANDALONE_DIR"/. "$SERVER_DIR/"

# Copy static files (Next.js needs these in .next/static)
# The standalone build includes .next but without static files
echo "📁 Copying static files..."
mkdir -p "$SERVER_DIR/.next/static"
cp -r "$STATIC_DIR"/* "$SERVER_DIR/.next/static/"

# Copy public files (fonts, images, etc.)
if [ -d "$PUBLIC_DIR" ]; then
  echo "📁 Copying public files..."
  mkdir -p "$SERVER_DIR/public"
  cp -r "$PUBLIC_DIR"/. "$SERVER_DIR/public/"
fi

# Create launcher script for Node to execute
cat > "$SERVER_DIR/start.js" << 'EOF'
// Launcher script for Next.js standalone server
const path = require('path');
const { execSync } = require('child_process');

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = '127.0.0.1';

// Change to server directory (where this script lives)
process.chdir(__dirname);

// Load and run the server
require('./server.js');
EOF

echo "✅ Standalone server prepared in $SERVER_DIR"
echo "📊 Size: $(du -sh "$SERVER_DIR" | cut -f1)"

