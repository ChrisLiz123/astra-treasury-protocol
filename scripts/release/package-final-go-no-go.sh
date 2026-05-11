#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-final-go-no-go"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a docs/mainnet-final "$STAGE/docs-mainnet-final"
cp -a docs/mainnet-live "$STAGE/docs-mainnet-live" 2>/dev/null || true
cp -a docs/governance-gate "$STAGE/docs-governance-gate" 2>/dev/null || true
cp -a scripts/validate-final-go-no-go.sh "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
