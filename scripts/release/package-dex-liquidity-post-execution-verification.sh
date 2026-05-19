#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-dex-liquidity-post-execution-verification"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/payload" "$STAGE/live"

cp -a configs/dex-liquidity-post-execution-verification.config.json "$STAGE/"
cp -a docs/dex-liquidity-post-execution-verification "$STAGE/docs/dex-liquidity-post-execution-verification"
cp -a services/dex-liquidity-post-execution-verification "$STAGE/services-dex-liquidity-post-execution-verification"
cp -a scripts/verify-dex-liquidity-post-execution.mjs "$STAGE/"
cp -a scripts/validate-dex-liquidity-post-execution-verification.mjs "$STAGE/"
cp -a public-docs/dex-liquidity-post-execution-verification.html "$STAGE/"
cp -a public-docs/dex-liquidity-post-execution-verification-status.json "$STAGE/"

cp -a reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-provision/live/liquidity-safe-executed.json "$STAGE/live/"
cp -a reports/dex-liquidity-provision/live/liquidity-added.json "$STAGE/live/"
cp -a reports/dex-liquidity-provision/live/position-minted.json "$STAGE/live/"
cp -a reports/dex-liquidity-provision/payload/liquidity-safe-payload.json "$STAGE/payload/"
cp -a reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json "$STAGE/payload/"
cp -a public-docs/dex-liquidity-safe-execution-live-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-status.json "$STAGE/evidence/"
cp -a public-docs/treasury-funding-status.json "$STAGE/evidence/"
cp -a public-docs/capability-matrix-status.json "$STAGE/evidence/"

cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a package.json "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

FORBIDDEN_PATTERN="(^|/)(node_modules|reports|backups|artifacts|cache|release|\.git|\.hardhat|out|artifacts-local|\.runtime)(/|$)|(^|/)(\.env|.*\.env|.*\.pem|.*\.key|.*keystore.*|mainnet-production\.config\.json)$|(^|/)(dex-public-trading-live-status\.json|dex-buy-page-activated-status\.json|full-launch-approved-status\.json|public-trading-live|buy-page-activated|full-launch-approved)$"

if find "$STAGE" -type f -print | sed "s#^$STAGE/##" | grep -E "$FORBIDDEN_PATTERN"; then
  echo "STOP: DEX liquidity post-execution verification package contains private/public-trading/full-launch files."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
