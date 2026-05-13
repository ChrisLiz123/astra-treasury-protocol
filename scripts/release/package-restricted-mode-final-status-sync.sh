#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-restricted-mode-final-status-sync"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a configs/restricted-mode-final-status.config.json "$STAGE/"
cp -a configs/public-status-update-finalization.config.json "$STAGE/"
cp -a docs/restricted-mode-final-status "$STAGE/docs-restricted-mode-final-status"
cp -a services/restricted-mode-final-status "$STAGE/services-restricted-mode-final-status"
cp -a services/public-status-update/status.mjs "$STAGE/"
cp -a services/launch-control/status.mjs "$STAGE/"
cp -a services/action-approval/governance-decision-status.mjs "$STAGE/"
cp -a scripts/validate-restricted-mode-final-status.mjs "$STAGE/"
cp -a scripts/validate-public-status-update-finalization.mjs "$STAGE/"
cp -a scripts/validate-action-approval-governance-decision.mjs "$STAGE/"
cp -a public-docs/restricted-mode-final-status.html "$STAGE/"
cp -a public-docs/restricted-mode-final-status.json "$STAGE/"
cp -a public-docs/public-status-update.html "$STAGE/"
cp -a public-docs/public-status-update-status.json "$STAGE/"
cp -a public-docs/launch-control.html "$STAGE/" 2>/dev/null || true
cp -a public-docs/launch-control-status.json "$STAGE/" 2>/dev/null || true
cp -a public-docs/governance-decision.html "$STAGE/" 2>/dev/null || true
cp -a public-docs/governance-decision-status.json "$STAGE/" 2>/dev/null || true
cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a package.json "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
