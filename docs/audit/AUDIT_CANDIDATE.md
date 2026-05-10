# AstraTreasury Protocol v0.1.1 Audit Candidate

## Status

Network: Base Sepolia
Mainnet launched: no
Real treasury funds: no
Public token sale: no
Audit candidate: yes

## Scope

- contracts/AstraToken.sol
- contracts/TreasuryPolicy.sol
- contracts/TreasuryVault.sol
- contracts/SignalRegistry.sol
- contracts/ExecutionController.sol
- scripts/stateful-local-check.ts
- scripts/local-stateful-fuzz.ts
- services/paper-trading/
- services/execution-queue/
- services/audit/

## Security work completed

- Public release safety check
- Live Base Sepolia invariant checks
- Local stateful audit checks
- Local randomized stateful fuzzing
- CI build with compile and audit checks
- Cancelled-signal execution issue found and patched

## Not ready for mainnet until

- External audit completed
- Legal review completed
- Multisig admin setup completed
- Dedicated production RPC configured
- Mainnet deployment runbook completed
- Incident response runbook completed

## Current public site

https://astratreasury.ai
https://www.astratreasury.ai
