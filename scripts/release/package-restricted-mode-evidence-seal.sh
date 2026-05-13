#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-restricted-mode-evidence-seal"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a configs/restricted-mode-evidence-seal.config.json "$STAGE/"
cp -a docs/restricted-mode-evidence-seal "$STAGE/docs-restricted-mode-evidence-seal"
cp -a services/restricted-mode-evidence-seal "$STAGE/services-restricted-mode-evidence-seal"
cp -a scripts/validate-restricted-mode-evidence-seal.mjs "$STAGE/"
cp -a public-docs/restricted-mode-evidence-seal.html "$STAGE/"
cp -a public-docs/restricted-mode-evidence-seal-status.json "$STAGE/"
cp -a reports/restricted-mode-evidence-seal/restricted-mode-evidence-seal.json "$STAGE/evidence-seal.json"
cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a package.json "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
