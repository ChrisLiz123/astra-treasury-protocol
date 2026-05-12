#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-announcement-publication-monitoring"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a configs/announcement-publication.config.json "$STAGE/"
cp -a services/announcement-publication "$STAGE/services-announcement-publication"
cp -a docs/announcement/ANNOUNCEMENT_PUBLICATION_CHECKLIST.md "$STAGE/"
cp -a docs/announcement/ANNOUNCEMENT_PUBLICATION_LOG.md "$STAGE/"
cp -a docs/announcement/POST_ANNOUNCEMENT_MONITORING.md "$STAGE/"
cp -a docs/announcement/ANNOUNCEMENT_PUBLICATION_STATUS.md "$STAGE/"
cp -a public-docs/announcement-publication.html "$STAGE/"
cp -a public-docs/announcement-publication-status.json "$STAGE/"
cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
