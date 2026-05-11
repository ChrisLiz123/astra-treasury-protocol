# Safe Transaction Payloads v1

## Status

Mode: TEMPLATE_PENDING_DEPLOYMENT_REPORT

## Purpose

Generate Governance Safe Transaction Builder payloads for AstraTreasury post-deployment setup.

## Transactions

1. TreasuryPolicy.setAssetPolicy(ASTRA_TOKEN, true, false)
2. TreasuryVault.grantRole(EXECUTOR_ROLE, ExecutionController)
3. SignalRegistry.grantRole(SIGNALER_ROLE, Signaler Safe)
4. ExecutionController.grantRole(EXECUTOR_ROLE, Executor Safe)

## Current rule

Template only. Do not import into Safe until mainnet deployment report exists and payload is regenerated.

## Generated files

- reports/mainnet-safe-payloads/governance-safe-postdeploy-role-setup.json
- reports/mainnet-safe-payloads/safe-payload-manifest-v1.json

## Safety

- No transaction is submitted by this generator.
- No Safe transaction is signed by this generator.
- No funds are moved by this generator.
- Review every transaction manually inside Safe before signing.
