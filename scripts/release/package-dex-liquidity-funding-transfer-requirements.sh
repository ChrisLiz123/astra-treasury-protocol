#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-dex-liquidity-funding-transfer-requirements"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs"

cp -a configs/dex-liquidity-funding-transfer-requirements.config.json "$STAGE/"
cp -a docs/dex-liquidity-funding-transfer-requirements "$STAGE/docs/dex-liquidity-funding-transfer-requirements"
cp -a services/dex-liquidity-funding-transfer-requirements "$STAGE/services-dex-liquidity-funding-transfer-requirements"
cp -a scripts/review-dex-liquidity-funding-transfer-requirements.mjs "$STAGE/"
cp -a scripts/validate-dex-liquidity-funding-transfer-requirements.mjs "$STAGE/"
cp -a public-docs/dex-liquidity-funding-transfer-requirements.html "$STAGE/"
cp -a public-docs/dex-liquidity-funding-transfer-requirements-status.json "$STAGE/"

cp -a reports/dex-liquidity-funding-transfer-requirements/dex-liquidity-funding-transfer-requirements-review.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-funding-transfer-requirements/dex-liquidity-funding-transfer-requirements-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a public-docs/dex-liquidity-treasury-funding-approval-status.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-treasury-funding-approval/dex-liquidity-treasury-funding-approval-record.json "$STAGE/evidence/" 2>/dev/null || true
cp -a public-docs/dex-liquidity-mint-parameter-review-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-token-approval-requirements-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-provision-approval-status.json "$STAGE/evidence/"
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

if find "$STAGE" -type f | grep -E "(funding-transfer-safe-payload|funds-moved|token-approval-safe-payload|liquidity-safe-payload|liquidity-added|position-minted|public-trading-live|private|secret|keystore)"; then
  echo "STOP: DEX funding transfer requirements package appears to contain funding/liquidity/public/private artifacts."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
