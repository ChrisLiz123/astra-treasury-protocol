#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-governance-vote-result-evidence-import"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a configs/governance-vote-result-evidence-import.config.json "$STAGE/"
cp -a docs/action-approvals/governance-vote-result-evidence "$STAGE/docs-governance-vote-result-evidence"
cp -a services/governance-vote-result-evidence "$STAGE/services-governance-vote-result-evidence"
cp -a scripts/validate-governance-vote-result-evidence.mjs "$STAGE/"
cp -a public-docs/governance-vote-result-evidence.html "$STAGE/"
cp -a public-docs/governance-vote-result-evidence-status.json "$STAGE/"
cp -a services/action-approval/governance-decision-status.mjs "$STAGE/"
cp -a scripts/validate-action-approval-governance-decision.mjs "$STAGE/"
cp -a public-docs/governance-decision-approval.html "$STAGE/" 2>/dev/null || true
cp -a public-docs/governance-decision-approval-status.json "$STAGE/" 2>/dev/null || true
cp -a services/public-site/server.mjs "$STAGE/"
cp -a services/public-refresh/refresh-loop.mjs "$STAGE/"
cp -a services/homepage/generate-homepage.mjs "$STAGE/"
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
