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

check_file docs/audit-selection/QUOTE_COMPARISON.md
check_file docs/audit-selection/AUDITOR_SELECTION_MATRIX.md
check_file docs/audit-selection/AUDITOR_SELECTION_DECISION.md
check_file docs/audit-selection/AUDIT_COMMIT_FREEZE.md
check_file docs/audit-selection/AUDIT_START_CHECKLIST.md
check_file docs/audit-selection/AUDIT_KICKOFF_PACKET.md
check_file docs/audit-selection/AUDIT_COMMUNICATION_PLAN.md
check_file docs/audit-outreach/AUDITOR_SHORTLIST.md
check_file docs/audit-intake/FINDINGS_TRACKER.md

if [ "$missing" -ne 0 ]; then
  echo "Audit selection validation failed."
  exit 1
fi

echo "Audit selection validation passed."
