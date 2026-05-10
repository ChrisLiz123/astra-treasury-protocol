# Multisig and Role Separation Plan

## Goal

No single private key should be able to move treasury funds, change treasury policy, or bypass execution controls.

## Recommended Safe structure

### Governance Safe

Suggested threshold: 3 of 5

Purpose:
- Own DEFAULT_ADMIN_ROLE where possible
- Manage policy updates
- Manage role grants and revocations
- Approve contract migrations
- Approve emergency recovery actions

### Treasury Safe

Suggested threshold: 3 of 5

Purpose:
- Hold assets not required inside TreasuryVault
- Approve treasury funding decisions
- Approve migration of reserves

### Operations Safe

Suggested threshold: 2 of 3

Purpose:
- Submit non-fund-moving operational approvals
- Coordinate approved SignalRegistry submissions if using Safe-based signing
- No direct TreasuryVault withdrawal authority

## Contract role mapping

| Contract | Role | Mainnet holder | Notes |
|---|---|---|---|
| AstraToken | token owner/admin if applicable | Governance Safe | Fixed supply preferred |
| TreasuryPolicy | admin | Governance Safe | Timelocked updates recommended |
| TreasuryVault | admin | Governance Safe | Execution role should be controller-only |
| TreasuryVault | EXECUTOR_ROLE | ExecutionController only | No EOA executor |
| SignalRegistry | admin | Governance Safe | Signaler role separated |
| SignalRegistry | SIGNALER_ROLE | Signaler Safe or limited signer | No treasury authority |
| ExecutionController | admin | Governance Safe | Execution role separated |
| ExecutionController | EXECUTOR_ROLE | Execution Safe or Governance Safe | No autonomous bot for mainnet v1 |

## Explicit exclusions for initial mainnet

- No Safe spending-limit modules
- No automated treasury movement
- No leverage
- No derivatives
- No public buyback promises
- No direct EOA vault executor
- No hidden wallets
