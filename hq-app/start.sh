#!/bin/bash
set -e
echo "==> Starting Business HQ backend..."
cd hq-app/backend && node index.js
