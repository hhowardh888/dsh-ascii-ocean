#!/bin/sh
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
esbuild="$here/node_modules/.bin/esbuild"
if [ ! -x "$esbuild" ]; then
  esbuild=$(command -v esbuild 2>/dev/null || true)
fi
if [ -z "$esbuild" ]; then
  echo "esbuild not found; run: npm install" >&2
  exit 1
fi
"$esbuild" "$here/build/entry.js" --bundle --format=iife --platform=browser \
  --target=chrome110 --charset=utf8 --outfile="$here/client.js"
