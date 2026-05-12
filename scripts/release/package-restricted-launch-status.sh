#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-restricted-launch-status"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a configs/restricted-launch.config.json "$STAGE/"
cp -a services/restricted-launch "$STAGE/services-restricted-launch"
cp -a docs/mainnet-live/RESTRICTED_LAUNCH_CHECKLIST.md "$STAGE/"
cp -a docs/mainnet-live/RESTRICTED_LAUNCH_STATUS_BOARD.md "$STAGE/"
cp -a docs/mainnet-live/RESTRICTED_LAUNCH_DECISION_RECORD.md "$STAGE/"
cp -a docs/mainnet-live/RESTRICTED_LAUNCH_STATUS.md "$STAGE/" 2>/dev/null || true
cp -a public-docs/launch.html "$STAGE/"
cp -a public-docs/restricted-launch-status.json "$STAGE/"
cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
