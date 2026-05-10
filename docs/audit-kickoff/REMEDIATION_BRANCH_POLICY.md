# Remediation Branch Policy

## Purpose

Define how fixes are made during audit remediation.

## Branch naming

remediation/ASTRA-001-short-title

## Required for every remediation branch

- Finding ID.
- Summary of issue.
- Commit hash of fix.
- Regression test or explanation.
- audit:full passing.
- release:prepare passing.
- Reviewer approval.

## Pull request description should include

- Finding ID.
- Severity.
- Root cause.
- Fix summary.
- Test commands run.
- Retest notes.

## Rule

Critical and high findings block mainnet until verified fixed.
