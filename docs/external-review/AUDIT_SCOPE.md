# AstraTreasury Audit Scope

## Primary contract scope

- contracts/AstraToken.sol
- contracts/TreasuryPolicy.sol
- contracts/TreasuryVault.sol
- contracts/SignalRegistry.sol
- contracts/ExecutionController.sol

## Script and workflow scope

- scripts/stateful-local-check.ts
- scripts/local-stateful-fuzz.ts
- scripts/deploy-controller-v011-base-sepolia.ts
- services/paper-trading/
- services/execution-queue/
- services/audit/

## Key security questions

1. Can TreasuryVault funds move without proper authorization?
2. Can ExecutionController bypass TreasuryPolicy?
3. Can duplicate action IDs be replayed?
4. Can cancelled signals execute?
5. Can unknown signals execute?
6. Can policy-invalid proposals execute?
7. Are roles scoped correctly?
8. Are pause controls sufficient?
9. Are events sufficient for auditability?
10. Are off-chain queue assumptions safe?
11. Are scripts safe to adapt for mainnet?

## Out of scope for current audit candidate

- Base Mainnet deployment
- Real treasury assets
- Public token sale
- Exchange listing
- Yield product
- Fully autonomous treasury execution

## Required auditor deliverables

- Findings report with severity ratings
- Reproduction steps
- Remediation recommendations
- Post-remediation review
- Mainnet readiness notes
