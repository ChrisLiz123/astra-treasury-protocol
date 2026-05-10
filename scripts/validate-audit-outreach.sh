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

check_file docs/audit-outreach/AUDITOR_SHORTLIST.md
check_file docs/audit-outreach/AUDITOR_SCORECARD.md
check_file docs/audit-outreach/OUTREACH_LOG.md
check_file docs/audit-outreach/AUDITOR_QUESTIONNAIRE.md
check_file docs/audit-outreach/AUDIT_SOW_CHECKLIST.md
check_file docs/audit-outreach/AUDITOR_SELECTION_CRITERIA.md
check_file docs/audit-outreach/AUDITOR_DECISION_RECORD.md
check_file docs/audit-intake/AUDITOR_INDEX.md
check_file docs/audit-intake/FINDINGS_TRACKER.md

if [ "$missing" -ne 0 ]; then
  echo "Audit outreach validation failed."
  exit 1
fi

echo "Audit outreach validation passed."
