#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-dex-pool-creation-safe-payload-generation"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/generated"

cp -a configs/dex-pool-creation-safe-payload-generation.config.json "$STAGE/"
cp -a docs/dex-pool-creation-safe-payload-generation "$STAGE/docs/dex-pool-creation-safe-payload-generation"
cp -a services/dex-pool-creation-safe-payload-generation "$STAGE/services-dex-pool-creation-safe-payload-generation"
cp -a scripts/generate-dex-pool-creation-safe-payload.mjs "$STAGE/"
cp -a scripts/validate-dex-pool-creation-safe-payload-generation.mjs "$STAGE/"
cp -a public-docs/dex-pool-creation-safe-payload-generation.html "$STAGE/"
cp -a public-docs/dex-pool-creation-safe-payload-generation-status.json "$STAGE/"

cp -a reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json "$STAGE/generated/"
cp -a reports/dex-pool-creation-safe-payload-generation/dex-pool-creation-safe-payload-generation-result.json "$STAGE/evidence/"
cp -a reports/dex-pool-creation-safe-payload-generation/dex-pool-creation-safe-payload-generation-status.json "$STAGE/evidence/" 2>/dev/null || true

cp -a public-docs/dex-pool-creation-safe-payload-generation-approval-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-safe-owners-threshold-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-factory-router-review-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json "$STAGE/evidence/"
cp -a public-docs/dex-pool-existence-precheck-status.json "$STAGE/evidence/"
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

find "$STAGE" -type d \( -name node_modules -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

if find "$STAGE" -type f | grep -E "(pool-created|direct-execution-submitted|executed|signed|signature|private|secret|keystore)"; then
  echo "STOP: package appears to contain execution/private artifacts."
  exit 1
fi

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
