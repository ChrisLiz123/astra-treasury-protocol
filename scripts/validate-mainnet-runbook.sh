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

check_file docs/mainnet/DRY_RUN_ONLY_DEPLOYMENT_RUNBOOK.md
check_file docs/mainnet/CONSTRUCTOR_ARGUMENT_MANIFEST.md
check_file docs/mainnet/ROLE_TRANSFER_CHECKLIST.md
check_file docs/mainnet/CONTRACT_VERIFICATION_CHECKLIST.md
check_file docs/mainnet/ROLLBACK_AND_PAUSE_CHECKLIST.md
check_file docs/mainnet/MAINNET_GO_NO_GO_CHECKLIST.md
check_file docs/mainnet/MAINNET_ARCHITECTURE.md
check_file configs/mainnet-constructor-args.template.json
check_file configs/mainnet-safe-role-plan.template.json

if [ "$missing" -ne 0 ]; then
  echo "Mainnet runbook validation failed."
  exit 1
fi

echo "Mainnet runbook validation passed."
