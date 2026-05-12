#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-professional-website-pages"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a services/professional-pages "$STAGE/services-professional-pages"
cp -a docs/website "$STAGE/docs-website"
cp -a public-docs/protocol.html "$STAGE/"
cp -a public-docs/protocol-status.json "$STAGE/"
cp -a public-docs/architecture.html "$STAGE/"
cp -a public-docs/architecture-status.json "$STAGE/"
cp -a public-docs/security.html "$STAGE/"
cp -a public-docs/security-status.json "$STAGE/"
cp -a public-docs/api.html "$STAGE/"
cp -a public-docs/api-directory.json "$STAGE/"
cp -a public-docs/faq.html "$STAGE/"
cp -a public-docs/faq-status.json "$STAGE/"
cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
