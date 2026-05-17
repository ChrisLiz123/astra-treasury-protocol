#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-dex-liquidity-safe-payload"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/payload"

cp -a configs/dex-liquidity-safe-payload.config.json "$STAGE/"
cp -a docs/dex-liquidity-safe-payload "$STAGE/docs/dex-liquidity-safe-payload"
cp -a services/dex-liquidity-safe-payload "$STAGE/services-dex-liquidity-safe-payload"
cp -a scripts/generate-dex-liquidity-safe-payload.mjs "$STAGE/"
cp -a scripts/validate-dex-liquidity-safe-payload.mjs "$STAGE/"
cp -a public-docs/dex-liquidity-safe-payload.html "$STAGE/"
cp -a public-docs/dex-liquidity-safe-payload-status.json "$STAGE/"

cp -a reports/dex-liquidity-provision/payload/liquidity-safe-payload.json "$STAGE/payload/"
cp -a reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json "$STAGE/payload/"
cp -a reports/dex-liquidity-safe-payload/dex-liquidity-safe-payload-generation.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-safe-payload/dex-liquidity-safe-payload-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a reports/dex-liquidity-safe-payload-generation-approval/dex-liquidity-safe-payload-generation-approval-record.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json "$STAGE/evidence/"
cp -a reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json "$STAGE/payload/"
cp -a public-docs/dex-liquidity-safe-payload-generation-approval-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-mint-calldata-verification-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-mint-calldata-status.json "$STAGE/evidence/"
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

FORBIDDEN_PATTERN="(^|/)(node_modules|reports|backups|artifacts|cache|release|\.git|\.hardhat|out|artifacts-local|\.runtime)(/|$)|(^|/)(\.env|.*\.env|.*\.pem|.*\.key|.*keystore.*|mainnet-production\.config\.json)$|(^|/)(dex-liquidity-safe-submission-live-record\.json|liquidity-added\.json|position-minted\.json|dex-liquidity-added-status\.json|dex-public-trading-live-status\.json)$"

if find "$STAGE" -type f -print | sed "s#^$STAGE/##" | grep -E "$FORBIDDEN_PATTERN"; then
  echo "STOP: DEX liquidity Safe payload package contains private/submitted/liquidity/public-trading files."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
