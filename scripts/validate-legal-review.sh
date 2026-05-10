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

check_file docs/legal-review/LEGAL_REVIEW_EXECUTION_PLAN.md
check_file docs/legal-review/LEGAL_COUNSEL_SHORTLIST.md
check_file docs/legal-review/LEGAL_ISSUE_TRACKER.md
check_file docs/legal-review/MARKETING_LANGUAGE_POLICY.md
check_file docs/legal-review/TOKENOMICS_LEGAL_REVIEW_CHECKLIST.md
check_file docs/legal-review/LEGAL_COUNSEL_SELECTION_DECISION.md
check_file docs/legal/LEGAL_REVIEW_BRIEF.md
check_file docs/legal/LEGAL_COUNSEL_OUTREACH_TEMPLATE.md
check_file DISCLAIMER.md

if [ "$missing" -ne 0 ]; then
  echo "Legal review validation failed."
  exit 1
fi

echo "Legal review validation passed."
