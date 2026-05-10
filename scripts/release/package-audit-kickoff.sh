#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-audit-kickoff"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a docs/audit-kickoff "$STAGE/docs-audit-kickoff"
cp -a docs/audit-selection "$STAGE/docs-audit-selection" 2>/dev/null || true
cp -a docs/audit-intake "$STAGE/docs-audit-intake" 2>/dev/null || true
cp -a docs/audit-outreach "$STAGE/docs-audit-outreach" 2>/dev/null || true
cp -a docs/external-review "$STAGE/docs-external-review" 2>/dev/null || true
cp -a .github/ISSUE_TEMPLATE "$STAGE/github-issue-templates"
cp -a deployments "$STAGE/deployments"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

rm -f "$STAGE/deployments/base-sepolia.env"

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
