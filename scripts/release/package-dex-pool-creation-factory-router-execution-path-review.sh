#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-dex-pool-creation-factory-router-execution-path-review"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs"

cp -a configs/dex-pool-creation-factory-router-review.config.json "$STAGE/"
cp -a docs/dex-pool-creation-factory-router-review "$STAGE/docs/dex-pool-creation-factory-router-review"
cp -a services/dex-pool-creation-factory-router-review "$STAGE/services-dex-pool-creation-factory-router-review"
cp -a scripts/review-dex-pool-creation-factory-router-execution-path.mjs "$STAGE/"
cp -a scripts/validate-dex-pool-creation-factory-router-execution-path.mjs "$STAGE/"
cp -a public-docs/dex-pool-creation-factory-router-review.html "$STAGE/"
cp -a public-docs/dex-pool-creation-factory-router-review-status.json "$STAGE/"

cp -a reports/dex-pool-creation-factory-router-review/dex-pool-creation-factory-router-review.json "$STAGE/evidence/"
cp -a reports/dex-pool-creation-factory-router-review/dex-pool-creation-factory-router-review-status.json "$STAGE/evidence/" 2>/dev/null || true
cp -a public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-safe-payload-draft-review-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-safe-payload-draft-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-safe-payload-preparation-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-execution-precheck-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-approval-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-existence-precheck-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-readiness-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-source-safe-impact-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-parameter-approval-status.json "$STAGE/evidence/"
cp -a public-docs/dex-liquidity-parameter-selection-status.json "$STAGE/evidence/"
cp -a public-docs/restricted-mode-final-release-status.json "$STAGE/evidence/"
cp -a public-docs/governance-decision-status.json "$STAGE/evidence/"
cp -a public-docs/capability-matrix-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-status.json "$STAGE/evidence/"
cp -a public-docs/treasury-funding-status.json "$STAGE/evidence/"
cp -a public-docs/treasury-safe-transaction-status.json "$STAGE/evidence/"
cp -a public-docs/mainnet-monitor-status.json "$STAGE/evidence/"
cp -a public-docs/mainnet-alerts-status.json "$STAGE/evidence/"
cp -a public-docs/incident-summary.json "$STAGE/evidence/"
cp -a public-docs/mainnet-execution-status.json "$STAGE/evidence/"

cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a package.json "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

if grep -R -E "\"(data|calldata|safeTxData|transactionData)\"[[:space:]]*:" "$STAGE"; then
  echo "STOP: factory/router review package appears to contain executable payload fields."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
