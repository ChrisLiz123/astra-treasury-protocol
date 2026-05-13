#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-treasury-disclosure-approval-package"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a configs/treasury-disclosure-approval.config.json "$STAGE/"
cp -a docs/treasury-disclosure "$STAGE/docs-treasury-disclosure"
cp -a services/treasury-disclosure "$STAGE/services-treasury-disclosure"
cp -a scripts/validate-treasury-disclosure-approval.mjs "$STAGE/"
cp -a public-docs/treasury-disclosure.html "$STAGE/"
cp -a public-docs/treasury-disclosure-status.json "$STAGE/"
cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
