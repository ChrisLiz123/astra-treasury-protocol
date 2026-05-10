# Audit Remediation Workflow

## Goal

Ensure every audit finding is triaged, fixed, retested, documented, and reviewed before mainnet.

## Workflow

### 1. Intake

- Record finding in FINDINGS_TRACKER.md.
- Assign severity.
- Assign owner.
- Preserve auditor reproduction steps.

### 2. Triage

- Determine exploitability.
- Determine affected contracts or scripts.
- Determine whether Base Sepolia deployment needs patching.
- Determine whether public docs need a note.

### 3. Fix

- Patch code.
- Add regression test.
- Run release:prepare.
- Run audit:full.
- Run domain:check.

### 4. Review

- Internal review.
- Auditor retest if applicable.
- Confirm finding status.

### 5. Release

- Commit fix.
- Push to GitHub.
- Tag patch release.
- Update public docs.
- Update review package.

## Mainnet blockers

Mainnet remains blocked while any CRITICAL or HIGH finding is open.

MEDIUM findings require explicit risk acceptance or verified remediation before mainnet.
