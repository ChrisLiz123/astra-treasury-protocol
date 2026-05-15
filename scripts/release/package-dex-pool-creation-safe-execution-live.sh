#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-dex-pool-creation-safe-execution-live"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/generated"

cp -a configs/dex-pool-creation-safe-execution-live.config.json "$STAGE/"
cp -a docs/dex-pool-creation-safe-execution-live "$STAGE/docs/dex-pool-creation-safe-execution-live"
cp -a services/dex-pool-creation-safe-execution-live "$STAGE/services-dex-pool-creation-safe-execution-live"
cp -a scripts/record-dex-pool-creation-safe-execution-live.mjs "$STAGE/"
cp -a scripts/validate-dex-pool-creation-safe-execution-live.mjs "$STAGE/"
cp -a public-docs/dex-pool-creation-safe-execution-live.html "$STAGE/"
cp -a public-docs/dex-pool-creation-safe-execution-live-status.json "$STAGE/"

cp -a reports/dex-pool-creation-safe-execution-live/dex-pool-creation-safe-execution-live-record.json "$STAGE/evidence/"
cp -a reports/dex-pool-creation-safe-execution-live/dex-pool-creation-safe-execution-live-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/dex-pool-creation/live/dex-pool-created.json "$STAGE/evidence/"
cp -a reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json "$STAGE/generated/"
cp -a public-docs/dex-pool-creation-safe-execution-approval-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-safe-pending-signatures-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-safe-submission-live-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-status.json "$STAGE/evidence/"
cp -a public-docs/treasury-funding-status.json "$STAGE/evidence/"
cp -a public-docs/mainnet-execution-status.json "$STAGE/evidence/"

cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a package.json "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

if find "$STAGE" -type f | grep -E "(private|secret|keystore)"; then
  echo "STOP: Safe execution live package appears to contain private artifacts."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
