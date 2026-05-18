#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-dex-liquidity-safe-execution-preparation"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/payload"

cp -a configs/dex-liquidity-safe-execution-preparation.config.json "$STAGE/"
cp -a docs/dex-liquidity-safe-execution-preparation "$STAGE/docs/dex-liquidity-safe-execution-preparation"
cp -a services/dex-liquidity-safe-execution-preparation "$STAGE/services-dex-liquidity-safe-execution-preparation"
cp -a scripts/prepare-dex-liquidity-safe-execution.mjs "$STAGE/"
cp -a scripts/validate-dex-liquidity-safe-execution-preparation.mjs "$STAGE/"
cp -a public-docs/dex-liquidity-safe-execution-preparation.html "$STAGE/"
cp -a public-docs/dex-liquidity-safe-execution-preparation-status.json "$STAGE/"

cp -a reports/dex-liquidity-safe-execution-preparation/dex-liquidity-safe-execution-preparation.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-safe-execution-preparation/dex-liquidity-safe-execution-preparation-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/dex-liquidity-safe-execution-approval/dex-liquidity-safe-execution-approval-record.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-provision/payload/liquidity-safe-payload.json "$STAGE/payload/"
cp -a reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json "$STAGE/payload/"
cp -a public-docs/dex-liquidity-safe-execution-approval-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-safe-pending-signatures-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-safe-submission-live-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-safe-payload-verification-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-safe-payload-status.json "$STAGE/evidence/"
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

FORBIDDEN_PATTERN="(^|/)(node_modules|reports|backups|artifacts|cache|release|\.git|\.hardhat|out|artifacts-local|\.runtime)(/|$)|(^|/)(\.env|.*\.env|.*\.pem|.*\.key|.*keystore.*|mainnet-production\.config\.json)$|(^|/)(dex-liquidity-safe-execution-live-record\.json|liquidity-added\.json|position-minted\.json|dex-liquidity-safe-execution-live-status\.json|dex-liquidity-added-status\.json|dex-public-trading-live-status\.json)$"

if find "$STAGE" -type f -print | sed "s#^$STAGE/##" | grep -E "$FORBIDDEN_PATTERN"; then
  echo "STOP: DEX liquidity Safe execution preparation package contains private/executed-liquidity/public-trading files."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
