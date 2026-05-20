#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-global-treasury-funding-approval"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/payload" "$STAGE/live"

cp -a configs/global-treasury-funding-approval.config.json "$STAGE/"
cp -a docs/global-treasury-funding-approval "$STAGE/docs/global-treasury-funding-approval"
cp -a services/global-treasury-funding-approval "$STAGE/services-global-treasury-funding-approval"
cp -a scripts/record-global-treasury-funding-approval.mjs "$STAGE/"
cp -a scripts/validate-global-treasury-funding-approval.mjs "$STAGE/"
cp -a public-docs/global-treasury-funding-approval.html "$STAGE/"
cp -a public-docs/global-treasury-funding-approval-status.json "$STAGE/"
cp -a public-docs/global-treasury-funding-approved-status.json "$STAGE/" 2>/dev/null || true

cp -a reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/global-treasury-funding-approval/global-treasury-funding-approval-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/global-treasury-funding/approval/global-treasury-funding-approved.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/global-treasury-funding-approval-review/global-treasury-funding-approval-review.json "$STAGE/evidence/"
cp -a reports/full-launch-live/full-launch-live-record.json "$STAGE/evidence/"
cp -a reports/full-launch/live/full-launch-live.json "$STAGE/live/"
cp -a reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-provision/live/liquidity-added.json "$STAGE/live/"
cp -a reports/dex-liquidity-provision/live/position-minted.json "$STAGE/live/"

cp -a public-docs/global-treasury-funding-approval-review-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-live-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-post-execution-verification-status.json "$STAGE/evidence/"
cp -a public-docs/treasury-funding-status.json "$STAGE/evidence/"
cp -a public-docs/launch.html "$STAGE/"
cp -a public-docs/buy.html "$STAGE/"

cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a package.json "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

FORBIDDEN_PATTERN="(^|/)(node_modules|reports|backups|artifacts|cache|release|\.git|\.hardhat|out|artifacts-local|\.runtime)(/|$)|(^|/)(\.env|.*\.env|.*\.pem|.*\.key|.*keystore.*|mainnet-production\.config\.json)$|(^|/)(global-treasury-funding-safe-payload\.json|global-treasury-funding-live-status\.json|treasury-funding-executed|global-treasury-funding-executed|funds-moved|safe-submission|safe-execution)$"

if find "$STAGE" -type f -print | sed "s#^$STAGE/##" | grep -E "$FORBIDDEN_PATTERN"; then
  echo "STOP: Global treasury funding approval package contains private/funding payload/execution/fund movement files."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
