# Mainnet Deployment Dry Run v1

## Status

Dry-run status: READY_FOR_FINAL_GO_NO_GO_REVIEW
Final deployment approval: PENDING_FINAL_GO_NO_GO

## Important

This dry run does not authorize deployment and does not send Base Mainnet transactions.

## Network

Base Mainnet

Chain ID: 8453

## Completed inputs

- Primary RPC provider selected.
- Backup RPC provider selected.
- Governance Safe configured.
- Treasury Safe configured.
- Executor Safe configured.
- Signaler Safe configured.
- Allocation wallets/Safes configured.
- Deployer address configured.
- Audit cleared.
- Legal cleared.

## Still required before deployment

- Final go/no-go approval.
- Mainnet deployment command review.
- Final BaseScan verification plan.
- Final signer availability check.
- Final incident response readiness check.

## Deployment sequence preview

1. Deploy TreasuryPolicy with Governance Safe as admin.
2. Deploy TreasuryVault with Governance Safe as admin and TreasuryPolicy address.
3. Deploy SignalRegistry with Governance Safe as admin.
4. Deploy ExecutionController with Governance Safe, TreasuryVault, TreasuryPolicy, and SignalRegistry.
5. Deploy AstraToken with TreasuryVault and allocation wallet/Safe addresses.
6. Approve ASTP as TreasuryPolicy asset if required by policy setup.
7. Grant TreasuryVault.EXECUTOR_ROLE to ExecutionController.
8. Grant SignalRegistry.SIGNALER_ROLE to Signaler Safe.
9. Grant ExecutionController.EXECUTOR_ROLE to Executor Safe.
10. Verify deployer has no long-term privileged role.
11. Verify contracts on BaseScan.
12. Update public deployment manifest only after final approval and deployment.

## Rule

Do not set `mainnetDeploymentApproved` to true until the final explicit go/no-go.
