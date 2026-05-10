# Post-Audit Release Process

## Purpose

Define how AstraTreasury handles audit results before any mainnet activity.

## Steps

1. Receive final audit report.
2. Record all findings in FINDINGS_TRACKER.md.
3. Patch findings by severity priority.
4. Add or update regression tests.
5. Run audit:full.
6. Run release:prepare.
7. Rebuild review packages.
8. Request auditor retest.
9. Publish final audit report if permitted.
10. Update public docs and disclaimers.
11. Update mainnet go/no-go checklist.

## Mainnet rule

No mainnet deployment until post-audit remediation is complete and legal review is complete.
