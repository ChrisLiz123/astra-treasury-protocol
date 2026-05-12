#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-basescan-mainnet-manifest"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a deployments/base-mainnet.public.json "$STAGE/"
cp -a docs/mainnet-live/BASE_MAINNET_DEPLOYMENT_MANIFEST.md "$STAGE/"
cp -a public-docs/mainnet.html "$STAGE/"
cp -a public-docs/mainnet-status.json "$STAGE/"
cp -a services/docs/generate-public-mainnet-docs.mjs "$STAGE/"
cp -a scripts/export-mainnet-verification-assets.mjs "$STAGE/"
cp -a reports/mainnet-verification/base-mainnet-verify-commands.sh "$STAGE/" 2>/dev/null || true
cp -a reports/mainnet-verification/constructor-args-no-0x "$STAGE/constructor-args-no-0x" 2>/dev/null || true
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
