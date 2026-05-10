#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-governance-gate"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a docs/governance-gate "$STAGE/docs-governance-gate"
cp -a docs/audit-intake "$STAGE/docs-audit-intake" 2>/dev/null || true
cp -a docs/audit-remediation "$STAGE/docs-audit-remediation" 2>/dev/null || true
cp -a docs/legal-review "$STAGE/docs-legal-review" 2>/dev/null || true
cp -a docs/legal-selection "$STAGE/docs-legal-selection" 2>/dev/null || true
cp -a docs/mainnet "$STAGE/docs-mainnet" 2>/dev/null || true
cp -a scripts/validate-governance-gate.sh "$STAGE/"
cp -a scripts/generate-governance-gate-status.mjs "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
