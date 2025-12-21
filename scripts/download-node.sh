#!/bin/bash

# Download Node.js binary for the current platform
# Used by Tauri sidecar to run Next.js standalone server

set -e

NODE_VERSION="20.10.0"
TAURI_RESOURCES_DIR="tauri/src-tauri/resources"

# Detect platform
OS=$(uname -s)
ARCH=$(uname -m)

# Node.js download naming
case "$OS" in
  Darwin)
    NODE_PLATFORM="darwin"
    ;;
  Linux)
    NODE_PLATFORM="linux"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64)
    NODE_ARCH="x64"
    ;;
  arm64|aarch64)
    NODE_ARCH="arm64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# Tauri target triple naming (must match exactly)
case "$OS-$ARCH" in
  Darwin-arm64)
    TAURI_TARGET="aarch64-apple-darwin"
    ;;
  Darwin-x86_64)
    TAURI_TARGET="x86_64-apple-darwin"
    ;;
  Linux-arm64|Linux-aarch64)
    TAURI_TARGET="aarch64-unknown-linux-gnu"
    ;;
  Linux-x86_64)
    TAURI_TARGET="x86_64-unknown-linux-gnu"
    ;;
  *)
    echo "Unsupported platform: $OS-$ARCH"
    exit 1
    ;;
esac

NODE_FILENAME="node-v${NODE_VERSION}-${NODE_PLATFORM}-${NODE_ARCH}"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_FILENAME}.tar.gz"
SIDECAR_NAME="node-sidecar-${TAURI_TARGET}"

echo "📦 Downloading Node.js v${NODE_VERSION} for ${NODE_PLATFORM}-${NODE_ARCH}..."
echo "📦 Tauri target: ${TAURI_TARGET}"

# Create resources directory
mkdir -p "$TAURI_RESOURCES_DIR"

# Download and extract Node.js
TEMP_DIR=$(mktemp -d)
curl -L "$NODE_URL" -o "$TEMP_DIR/node.tar.gz"
tar -xzf "$TEMP_DIR/node.tar.gz" -C "$TEMP_DIR"

# Copy just the node binary
cp "$TEMP_DIR/${NODE_FILENAME}/bin/node" "$TAURI_RESOURCES_DIR/${SIDECAR_NAME}"
chmod +x "$TAURI_RESOURCES_DIR/${SIDECAR_NAME}"

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Node.js binary saved to $TAURI_RESOURCES_DIR/${SIDECAR_NAME}"
ls -lh "$TAURI_RESOURCES_DIR/${SIDECAR_NAME}"

