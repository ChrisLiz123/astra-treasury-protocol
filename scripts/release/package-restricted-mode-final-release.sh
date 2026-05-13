#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-restricted-mode-final-release"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE/evidence" "$STAGE/releases"

cp -a configs/restricted-mode-final-release.config.json "$STAGE/"
cp -a docs/restricted-mode-final-release "$STAGE/docs-restricted-mode-final-release"
cp -a services/restricted-mode-final-release "$STAGE/services-restricted-mode-final-release"
cp -a scripts/validate-restricted-mode-final-release.mjs "$STAGE/"
cp -a public-docs/restricted-mode-final-release.html "$STAGE/"
cp -a public-docs/restricted-mode-final-release-status.json "$STAGE/"

cp -a release/astra-treasury-protocol-v0.1.1-restricted-mode-release-candidate.tar.gz "$STAGE/releases/"

cp -a reports/full-launch-governance-decision/live/governance-decision-record.json "$STAGE/evidence/"
cp -a reports/action-approvals/governance-decision/action-approval-record.json "$STAGE/evidence/"
cp -a reports/signed-governance-resolution-evidence/import/signed-governance-resolution-evidence.json "$STAGE/evidence/"
cp -a reports/restricted-mode-evidence-seal/restricted-mode-evidence-seal.json "$STAGE/evidence/"
cp -a reports/restricted-mode-release-candidate/restricted-mode-release-candidate-status.json "$STAGE/evidence/"
cp -a reports/restricted-mode-final-release/restricted-mode-final-release-status.json "$STAGE/evidence/"

cp -a public-docs/governance-decision-status.json "$STAGE/evidence/"
cp -a public-docs/restricted-mode-final-status.json "$STAGE/evidence/"
cp -a public-docs/restricted-mode-monitoring-baseline-status.json "$STAGE/evidence/"
cp -a public-docs/restricted-mode-evidence-seal-status.json "$STAGE/evidence/"
cp -a public-docs/restricted-mode-release-candidate-status.json "$STAGE/evidence/"
cp -a public-docs/capability-matrix-status.json "$STAGE/evidence/"
cp -a public-docs/public-status-update-status.json "$STAGE/evidence/"
cp -a public-docs/launch-control-status.json "$STAGE/evidence/"
cp -a public-docs/mainnet-monitor-status.json "$STAGE/evidence/"
cp -a public-docs/mainnet-alerts-status.json "$STAGE/evidence/"
cp -a public-docs/incident-summary.json "$STAGE/evidence/"
cp -a public-docs/mainnet-execution-status.json "$STAGE/evidence/"
cp -a public-docs/treasury-funding-status.json "$STAGE/evidence/"
cp -a public-docs/treasury-safe-transaction-status.json "$STAGE/evidence/"
cp -a public-docs/full-launch-status.json "$STAGE/evidence/"

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
