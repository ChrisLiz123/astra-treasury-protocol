#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-mainnet-dry-run-v1"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a docs/mainnet-live/MAINNET_DEPLOYMENT_DRY_RUN_V1.md "$STAGE/"
cp -a docs/mainnet-live/PRODUCTION_CONFIGURATION_LOCK.md "$STAGE/"
cp -a docs/mainnet-live/AUDIT_LEGAL_CLEARANCE_RECORD.md "$STAGE/"
cp -a docs/mainnet-live/PRODUCTION_ADDRESS_BOOK.md "$STAGE/"
cp -a scripts/mainnet-deployment-dry-run-v1.mjs "$STAGE/"
cp -a configs/mainnet-production.config.template.json "$STAGE/" 2>/dev/null || true
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
