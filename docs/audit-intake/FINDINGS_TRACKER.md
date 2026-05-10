# Audit Findings Tracker

## Status legend

- OPEN
- ACKNOWLEDGED
- FIX_IN_PROGRESS
- FIXED_PENDING_RETEST
- FIX_VERIFIED
- WONT_FIX_ACCEPTED_RISK

## Severity legend

- CRITICAL
- HIGH
- MEDIUM
- LOW
- INFORMATIONAL

## Findings

| ID | Severity | Title | Status | Owner | Fix Branch | Fix Commit | Retest Status | Notes |
|---|---|---|---|---|---|---|---|---|
| ASTRA-001 | MEDIUM | Cancelled signals executable in v0.1.0 | FIX_VERIFIED | AstraTreasury | fixed-before-tracker |  | Local stateful audit passing | Found internally and fixed in v0.1.1 before external audit. |

## Process

1. Every finding gets an ID.
2. Every finding gets an owner.
3. Every fix gets a commit hash.
4. Every fix gets a regression test where possible.
5. Every fix is retested before closure.
6. Critical and high findings block mainnet.
