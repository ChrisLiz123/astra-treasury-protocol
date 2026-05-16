#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-dex-liquidity-token-approval-safe-submission-dry-run"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/payload"

cp -a configs/dex-liquidity-token-approval-safe-submission-dry-run.config.json "$STAGE/"
cp -a docs/dex-liquidity-token-approval-safe-submission-dry-run "$STAGE/docs/dex-liquidity-token-approval-safe-submission-dry-run"
cp -a services/dex-liquidity-token-approval-safe-submission-dry-run "$STAGE/services-dex-liquidity-token-approval-safe-submission-dry-run"
cp -a scripts/dry-run-dex-liquidity-token-approval-safe-submission.mjs "$STAGE/"
cp -a scripts/validate-dex-liquidity-token-approval-safe-submission-dry-run.mjs "$STAGE/"
cp -a public-docs/dex-liquidity-token-approval-safe-submission-dry-run.html "$STAGE/"
cp -a public-docs/dex-liquidity-token-approval-safe-submission-dry-run-status.json "$STAGE/"

cp -a reports/dex-liquidity-token-approval-safe-submission-dry-run/dex-liquidity-token-approval-safe-submission-dry-run.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-token-approval-safe-submission-dry-run/dex-liquidity-token-approval-safe-submission-dry-run-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/dex-liquidity-token-approval-safe-submission-preparation/dex-liquidity-token-approval-safe-submission-preparation.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-token-approval-safe-submission-approval/dex-liquidity-token-approval-safe-submission-approval-record.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-token-approval-safe-payload-verification/dex-liquidity-token-approval-safe-payload-verification.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json "$STAGE/payload/"
cp -a reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json "$STAGE/payload/"
cp -a public-docs/dex-liquidity-token-approval-safe-submission-preparation-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-token-approval-safe-payload-status.json "$STAGE/evidence/"
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

if find "$STAGE" -type f | grep -E "(safe-submission-live|token-approval-executed|liquidity-added|position-minted|public-trading-live|private|secret|keystore)"; then
  echo "STOP: DEX token approval Safe submission dry-run package contains live/executed/liquidity/public/private artifacts."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
