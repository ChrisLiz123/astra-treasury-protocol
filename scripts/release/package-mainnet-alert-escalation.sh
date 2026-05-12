#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-mainnet-alert-escalation"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a configs/mainnet-alert-escalation.config.json "$STAGE/"
cp -a services/mainnet-alerts "$STAGE/services-mainnet-alerts"
cp -a docs/mainnet-live/MAINNET_ALERT_ESCALATION_RUNBOOK.md "$STAGE/"
cp -a docs/mainnet-live/VAULT_OUTFLOW_RESPONSE.md "$STAGE/"
cp -a docs/mainnet-live/ROLE_CHANGE_RESPONSE.md "$STAGE/"
cp -a docs/mainnet-live/PAUSE_EVENT_RESPONSE.md "$STAGE/"
cp -a docs/mainnet-live/RESTRICTED_FLAG_RESPONSE.md "$STAGE/"
cp -a docs/mainnet-live/MAINNET_ALERT_STATUS.md "$STAGE/" 2>/dev/null || true
cp -a public-docs/alerts.html "$STAGE/"
cp -a public-docs/mainnet-alerts-status.json "$STAGE/"
cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
