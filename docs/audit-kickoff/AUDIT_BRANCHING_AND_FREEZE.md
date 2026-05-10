# Audit Branching and Freeze Policy

## Purpose

Define how code is frozen and changed during audit.

## Recommended branches

main: public stable branch
audit/v0.1.1: frozen audit branch
remediation/ASTRA-XXX-short-title: fix branch for a specific finding

## Recommended tags

audit-start-v0.1.1: exact commit provided to auditor
audit-remediation-v0.1.1: post-fix remediation checkpoint
v0.1.1-audit-final: final post-audit tag if applicable

## Rules

- Do not silently change the audit branch.
- Every finding fix gets a finding ID.
- Every contract change gets a regression test where practical.
- Every remediation commit is documented.
- Mainnet remains blocked until audit and legal gates are complete.
