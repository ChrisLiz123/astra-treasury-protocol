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

check_file docs/legal-selection/LEGAL_COUNSEL_OUTREACH_PLAN.md
check_file docs/legal-selection/LEGAL_COUNSEL_OUTREACH_LOG.md
check_file docs/legal-selection/LEGAL_COUNSEL_QUESTIONNAIRE.md
check_file docs/legal-selection/LEGAL_COUNSEL_SCORECARD.md
check_file docs/legal-selection/LEGAL_QUOTE_COMPARISON.md
check_file docs/legal-selection/LEGAL_SELECTION_DECISION.md
check_file docs/legal-selection/LEGAL_ENGAGEMENT_CHECKLIST.md
check_file docs/legal-selection/LEGAL_REVIEW_START_MANIFEST.md
check_file docs/legal-review/LEGAL_REVIEW_EXECUTION_PLAN.md
check_file docs/legal-review/LEGAL_ISSUE_TRACKER.md
check_file docs/legal-review/MARKETING_LANGUAGE_POLICY.md
check_file docs/legal-review/TOKENOMICS_LEGAL_REVIEW_CHECKLIST.md

if [ "$missing" -ne 0 ]; then
  echo "Legal counsel selection validation failed."
  exit 1
fi

echo "Legal counsel selection validation passed."
