#!/usr/bin/env bash
set -euo pipefail

missing=0

check_file() {
  if [ ! -f "$1" ]; then
    echo "Missing: $1"
    missing=1
  else
    echo "OK: $1"
  fi
}

check_file docs/mainnet-final/FINAL_GO_NO_GO_REVIEW.md
check_file docs/mainnet-final/FINAL_SIGNOFF_RECORD.md
check_file docs/mainnet-final/DEPLOYMENT_REHEARSAL_REVIEW.md
check_file docs/mainnet-final/DEPLOYMENT_DAY_CHECKLIST.md
check_file docs/mainnet-live/MAINNET_DEPLOYMENT_DRY_RUN_V1.md
check_file docs/mainnet-live/MAINNET_DEPLOYMENT_COMMANDS_V1.md
check_file docs/mainnet-live/SAFE_TRANSACTION_PAYLOADS_V1.md
check_file scripts/deploy-base-mainnet-guarded.ts
check_file scripts/generate-mainnet-deployment-commands-v1.mjs
check_file scripts/generate-safe-transaction-payloads-v1.mjs

if [ "$missing" -ne 0 ]; then
  echo "Final go/no-go validation failed."
  exit 1
fi

echo "Final go/no-go validation passed."
