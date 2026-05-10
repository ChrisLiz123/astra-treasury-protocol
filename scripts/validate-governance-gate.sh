#!/usr/bin/env bash
set -euo pipefail

missing=0

check_file() {
  if [ ! -f "$1" ]; then
    echo "Missing: $1"
    missing=1
  else
    echo "OK: $1"
  fi
}

check_file docs/governance-gate/COMBINED_AUDIT_LEGAL_GATE.md
check_file docs/governance-gate/MAINNET_BLOCKER_REGISTER.md
check_file docs/governance-gate/SIGNOFF_MATRIX.md
check_file docs/governance-gate/GOVERNANCE_GATE_DECISION_RECORD.md
check_file docs/audit-intake/FINDINGS_TRACKER.md
check_file docs/audit-remediation/audit-findings.json
check_file docs/legal-review/LEGAL_ISSUE_TRACKER.md
check_file docs/legal-selection/LEGAL_SELECTION_DECISION.md
check_file docs/audit-selection/AUDITOR_SELECTION_DECISION.md
check_file docs/mainnet/MAINNET_GO_NO_GO_CHECKLIST.md
check_file docs/mainnet/MULTISIG_AND_ROLES.md
check_file docs/ops/INCIDENT_RESPONSE_RUNBOOK.md

if [ "$missing" -ne 0 ]; then
  echo "Governance gate validation failed."
  exit 1
fi

echo "Governance gate validation passed."
