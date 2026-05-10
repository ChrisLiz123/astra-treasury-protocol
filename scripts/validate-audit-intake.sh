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

check_file docs/audit-intake/AUDITOR_INDEX.md
check_file docs/audit-intake/PACKAGE_INDEX.md
check_file docs/audit-intake/FINDINGS_TRACKER.md
check_file docs/audit-intake/REMEDIATION_WORKFLOW.md
check_file docs/audit-intake/AUDIT_INTAKE_CHECKLIST.md
check_file docs/audit-intake/POST_AUDIT_RELEASE_PROCESS.md
check_file docs/external-review/AUDIT_SCOPE.md
check_file docs/external-review/EXTERNAL_REVIEW_BRIEF.md
check_file docs/audit/AUDIT_CANDIDATE.md

if [ "$missing" -ne 0 ]; then
  echo "Audit intake validation failed."
  exit 1
fi

echo "Audit intake validation passed."
