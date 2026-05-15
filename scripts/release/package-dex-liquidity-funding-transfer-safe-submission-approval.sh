#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-dex-liquidity-funding-transfer-safe-submission-approval"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/payload"

cp -a configs/dex-liquidity-funding-transfer-safe-submission-approval.config.json "$STAGE/"
cp -a docs/dex-liquidity-funding-transfer-safe-submission-approval "$STAGE/docs/dex-liquidity-funding-transfer-safe-submission-approval"
cp -a services/dex-liquidity-funding-transfer-safe-submission-approval "$STAGE/services-dex-liquidity-funding-transfer-safe-submission-approval"
cp -a scripts/record-dex-liquidity-funding-transfer-safe-submission-approval.mjs "$STAGE/"
cp -a scripts/validate-dex-liquidity-funding-transfer-safe-submission-approval.mjs "$STAGE/"
cp -a public-docs/dex-liquidity-funding-transfer-safe-submission-approval.html "$STAGE/"
cp -a public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json "$STAGE/"

cp -a reports/dex-liquidity-funding-transfer-safe-submission-approval/dex-liquidity-funding-transfer-safe-submission-approval-record.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/dex-liquidity-funding-transfer-safe-submission-approval/dex-liquidity-funding-transfer-safe-submission-approval-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json "$STAGE/payload/"
cp -a public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-funding-transfer-safe-payload-verification/dex-liquidity-funding-transfer-safe-payload-verification.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-funding-transfer-safe-payload-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-post-execution-verification-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-status.json "$STAGE/evidence/"
cp -a public-docs/treasury-funding-status.json "$STAGE/evidence/"
cp -a public-docs/capability-matrix-status.json "$STAGE/evidence/"
cp -a public-docs/mainnet-execution-status.json "$STAGE/evidence/"

cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a package.json "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

if find "$STAGE" -type f | grep -E "(safe-submission-live|funds-moved|liquidity-added|position-minted|public-trading-live|private|secret|keystore)"; then
  echo "STOP: DEX funding-transfer Safe submission approval package appears to contain live/liquidity/public/private artifacts."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
