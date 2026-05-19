#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-full-launch-live"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/payload" "$STAGE/live"

cp -a configs/full-launch-live.config.json "$STAGE/"
cp -a docs/full-launch-live "$STAGE/docs/full-launch-live"
cp -a services/full-launch-live "$STAGE/services-full-launch-live"
cp -a scripts/record-full-launch-live.mjs "$STAGE/"
cp -a scripts/validate-full-launch-live.mjs "$STAGE/"
cp -a public-docs/full-launch-live.html "$STAGE/"
cp -a public-docs/full-launch-live-status.json "$STAGE/"
cp -a public-docs/launch.html "$STAGE/"

cp -a reports/full-launch-live/full-launch-live-record.json "$STAGE/evidence/"
cp -a reports/full-launch-live/full-launch-live-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/full-launch/live/full-launch-live.json "$STAGE/live/"
cp -a reports/full-launch-approval/full-launch-approval-record.json "$STAGE/evidence/"
cp -a reports/full-launch/approval/full-launch-approved.json "$STAGE/evidence/"
cp -a reports/full-launch-readiness-review/full-launch-readiness-review.json "$STAGE/evidence/"
cp -a reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json "$STAGE/evidence/"
cp -a reports/dex-buy-page/live/buy-page-activated.json "$STAGE/live/"
cp -a reports/dex-public-trading/live/public-trading-live.json "$STAGE/live/"
cp -a reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-provision/live/liquidity-added.json "$STAGE/live/"
cp -a reports/dex-liquidity-provision/live/position-minted.json "$STAGE/live/"
cp -a reports/dex-liquidity-provision/payload/liquidity-safe-payload.json "$STAGE/payload/"
cp -a public-docs/buy.html "$STAGE/"
cp -a public-docs/full-launch-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-approval-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-approved-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-readiness-review-status.json "$STAGE/evidence/"
cp -a public-docs/dex-buy-page-activation-live-status.json "$STAGE/evidence/"
cp -a public-docs/dex-public-trading-live-status.json "$STAGE/evidence/"
cp -a public-docs/dex-buy-page-activated-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-post-execution-verification-status.json "$STAGE/evidence/"
cp -a public-docs/treasury-funding-status.json "$STAGE/evidence/"

cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a package.json "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

FORBIDDEN_PATTERN="(^|/)(node_modules|reports|backups|artifacts|cache|release|\.git|\.hardhat|out|artifacts-local|\.runtime)(/|$)|(^|/)(\.env|.*\.env|.*\.pem|.*\.key|.*keystore.*|mainnet-production\.config\.json)$|(^|/)(treasury-funding-executed|global-treasury-funding-executed|treasury-funding-safe-execution-live|treasury-funding-live)$"

if find "$STAGE" -type f -print | sed "s#^$STAGE/##" | grep -E "$FORBIDDEN_PATTERN"; then
  echo "STOP: Full launch live package contains private/treasury-funding-execution files."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
