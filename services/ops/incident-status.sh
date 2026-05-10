#!/usr/bin/env bash
set -euo pipefail

ROOT="${ASTRA_ROOT:-/opt/astra-treasury-protocol}"
cd "$ROOT"

mkdir -p reports/ops
OUT="reports/ops/latest-incident-status.txt"

{
  echo "AstraTreasury Incident Status"
  echo "=============================="
  date -u
  echo
  echo "PM2"
  pm2 status || true
  echo
  echo "Local public site"
  curl -s http://127.0.0.1:8790/healthz || true
  echo
  echo "Private dashboard health"
  curl -s http://127.0.0.1:8787/api/health | head -n 80 || true
  echo
  echo "Public HTTPS root"
  curl -I -s https://astratreasury.ai | head -n 8 || true
  echo
  echo "Public HTTPS www"
  curl -I -s https://www.astratreasury.ai | head -n 8 || true
  echo
  echo "Ops status"
  npm run ops:status || true
  echo
  echo "Domain check"
  npm run domain:check || true
} | tee "$OUT"

echo
echo "Incident status saved to $OUT"
