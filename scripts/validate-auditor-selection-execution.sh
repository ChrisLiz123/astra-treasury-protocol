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

check_file docs/audit-selection/SELECTED_AUDITOR_RECORD.md
check_file docs/audit-selection/AUDITOR_SELECTION_DECISION.md
check_file docs/audit-selection/AUDIT_KICKOFF_PACKET.md
check_file docs/audit-selection/AUDIT_START_CHECKLIST.md
check_file docs/audit-kickoff/AUDIT_KICKOFF_RUNBOOK.md
check_file docs/audit-intake/FINDINGS_TRACKER.md
check_file docs/audit-start/AUDIT_START_MANIFEST.md
check_file docs/audit-start/audit-start-manifest.json

if [ "$missing" -ne 0 ]; then
  echo "Auditor selection execution validation failed."
  exit 1
fi

if grep -q "Selection status: PENDING_SELECTION" docs/audit-selection/SELECTED_AUDITOR_RECORD.md; then
  echo "Notice: auditor selection is still marked PENDING_SELECTION."
  echo "This is acceptable before an auditor is chosen."
fi

echo "Auditor selection execution validation passed."
