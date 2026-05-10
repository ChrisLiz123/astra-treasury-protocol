# AstraTreasury Auditor Intake Index

## Project

AstraTreasury Protocol v0.1.1

## Status

Network: Base Sepolia
Mainnet launched: no
Real treasury funds: no
Public token sale: no
Investment product: no

## Public site

https://astratreasury.ai
https://www.astratreasury.ai

## Repository status

CI passing.
Release safety check passing.
Live invariant checks passing.
Local stateful checks passing.
Local randomized stateful fuzz checks passing.
Safe role-transfer dry run passing.
Mainnet runbook validation passing.

## Suggested auditor reading order

1. README.md
2. DISCLAIMER.md
3. SECURITY.md
4. docs/external-review/EXTERNAL_REVIEW_BRIEF.md
5. docs/external-review/AUDIT_SCOPE.md
6. docs/audit/AUDIT_CANDIDATE.md
7. docs/audit/INVARIANTS.md
8. docs/audit/LOCAL_FUZZING.md
9. docs/mainnet/MAINNET_ARCHITECTURE.md
10. docs/mainnet/MULTISIG_AND_ROLES.md
11. docs/mainnet/MAINNET_GO_NO_GO_CHECKLIST.md
12. docs/ops/INCIDENT_RESPONSE_RUNBOOK.md

## Primary audit scope

- contracts/AstraToken.sol
- contracts/TreasuryPolicy.sol
- contracts/TreasuryVault.sol
- contracts/SignalRegistry.sol
- contracts/ExecutionController.sol

## Supporting workflow scope

- scripts/stateful-local-check.ts
- scripts/local-stateful-fuzz.ts
- scripts/local-safe-role-transfer-dry-run.ts
- services/paper-trading/
- services/execution-queue/
- services/audit/

## Known fixed issue

v0.1.0 allowed cancelled SignalRegistry signals to execute through ExecutionController.

v0.1.1 patched ExecutionController so cancelled signals revert before treasury execution.
