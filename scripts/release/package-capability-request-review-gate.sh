#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-capability-request-review-gate"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/docs" "$STAGE/requests"

cp -a configs/capability-request-review.config.json "$STAGE/"
cp -a docs/capability-request-review "$STAGE/docs/capability-request-review"
cp -a services/capability-request-review "$STAGE/services-capability-request-review"
cp -a scripts/validate-capability-request-review.mjs "$STAGE/"
cp -a public-docs/capability-request-review.html "$STAGE/"
cp -a public-docs/capability-request-review-status.json "$STAGE/"

cp -a reports/capability-activation-intake/requests/capability-activation-request.json "$STAGE/requests/" 2>/dev/null || true

cp -a public-docs/capability-request-import-status.json "$STAGE/evidence/"
cp -a public-docs/capability-activation-intake-status.json "$STAGE/evidence/"
cp -a public-docs/restricted-mode-operator-checklist-status.json "$STAGE/evidence/"
cp -a public-docs/restricted-mode-maintenance-schedule-status.json "$STAGE/evidence/"
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

find "$STAGE" -type f -print0 | sort -z | xargs -0 sha256sum > "$STAGE/SHA256SUMS"

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE" "$ARCHIVE.sha256"
