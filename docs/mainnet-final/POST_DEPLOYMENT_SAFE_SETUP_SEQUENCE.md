# Post-Deployment Safe Setup Sequence

## Status

Only use after reports/mainnet-deployment/mainnet-deployment-v1.json exists.

## Sequence

1. Run npm run safe:payloads:v1:require-deployment.
2. Confirm mode is READY_FOR_SAFE_TRANSACTION_BUILDER_IMPORT.
3. Open reports/mainnet-safe-payloads/governance-safe-postdeploy-role-setup.json.
4. Review all four transactions manually.
5. Import into Governance Safe Transaction Builder.
6. Confirm each target address matches the deployment report.
7. Confirm each role hash is expected.
8. Have Safe owners review and sign.
9. Execute Safe batch.
10. Run post-deployment role checks.

## Required Safe transactions

- TreasuryPolicy.setAssetPolicy(ASTRA_TOKEN, true, false)
- TreasuryVault.grantRole(EXECUTOR_ROLE, ExecutionController)
- SignalRegistry.grantRole(SIGNALER_ROLE, Signaler Safe)
- ExecutionController.grantRole(EXECUTOR_ROLE, Executor Safe)

## Rule

Never import template payloads. Only import payloads generated after the deployment report exists.
