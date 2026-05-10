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

check_file docs/audit-kickoff/AUDIT_KICKOFF_RUNBOOK.md
check_file docs/audit-kickoff/AUDIT_BRANCHING_AND_FREEZE.md
check_file docs/audit-kickoff/FINDING_ID_REGISTRY.md
check_file docs/audit-kickoff/REMEDIATION_BRANCH_POLICY.md
check_file docs/audit-kickoff/RETEST_CHECKLIST.md
check_file docs/audit-kickoff/AUDIT_STATUS_BOARD.md
check_file .github/ISSUE_TEMPLATE/audit-finding.md
check_file .github/ISSUE_TEMPLATE/audit-remediation.md
check_file docs/audit-intake/FINDINGS_TRACKER.md
check_file docs/audit-selection/AUDIT_START_CHECKLIST.md

if [ "$missing" -ne 0 ]; then
  echo "Audit kickoff validation failed."
  exit 1
fi

echo "Audit kickoff validation passed."
