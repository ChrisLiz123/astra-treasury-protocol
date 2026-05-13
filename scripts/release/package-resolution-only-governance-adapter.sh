#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-resolution-only-governance-adapter"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a configs/action-approval-governance-decision.config.json "$STAGE/"
cp -a configs/governance-decision-live-precheck.config.json "$STAGE/"
cp -a configs/signed-governance-resolution-evidence-import.config.json "$STAGE/"
cp -a configs/governance-vote-result-evidence-import.config.json "$STAGE/"
cp -a docs/action-approvals/signed-governance-resolution-evidence "$STAGE/docs-signed-governance-resolution-evidence"
cp -a services/signed-governance-resolution-evidence/status.mjs "$STAGE/"
cp -a scripts/validate-signed-governance-resolution-evidence.mjs "$STAGE/"
cp -a services/action-approval/governance-decision-status.mjs "$STAGE/"
cp -a services/governance-decision-live-precheck/status.mjs "$STAGE/"
cp -a scripts/record-governance-decision-action-approval.mjs "$STAGE/"
cp -a public-docs/signed-governance-resolution-evidence.html "$STAGE/" 2>/dev/null || true
cp -a public-docs/signed-governance-resolution-evidence-status.json "$STAGE/" 2>/dev/null || true
cp -a public-docs/governance-decision-approval.html "$STAGE/" 2>/dev/null || true
cp -a public-docs/governance-decision-approval-status.json "$STAGE/" 2>/dev/null || true
cp -a public-docs/governance-decision-live-precheck.html "$STAGE/" 2>/dev/null || true
cp -a public-docs/governance-decision-live-precheck-status.json "$STAGE/" 2>/dev/null || true
cp -a README.md DISCLAIMER.md SECURITY.md CONTRIBUTING.md "$STAGE/" 2>/dev/null || true

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local -o -name .runtime \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" -o -name "mainnet-production.config.json" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
