# Mainnet Deployment Session Execution Plan v1

## Status

Deployment session: prepared
Deployment executed: no
Real treasury funding: no
Public token sale: no
Safe payload import: only after deployment report exists

## Purpose

Define the exact one-session sequence for approving, deploying, checking, and locking the AstraTreasury Base Mainnet deployment.

## Session rule

Do not set mainnetDeploymentApproved=true unless deployment will happen in the same operator session.

## Execution sequence

1. Run mainnet:approval:preflight.
2. Approve deployment with ASTRA_CONFIRM_MAINNET_APPROVAL=YES npm run mainnet:approval:approve.
3. Run mainnet:deployment-session:preflight-approved.
4. Run guarded deployment with ASTRA_MAINNET_DEPLOYMENT_APPROVED=YES npm run deploy:base-mainnet:guarded.
5. Confirm reports/mainnet-deployment/mainnet-deployment-v1.json exists.
6. Reset approval with npm run mainnet:approval:reset.
7. Generate real Safe payloads with npm run safe:payloads:v1:require-deployment.
8. Review Safe payloads manually before importing into Safe.

## Failure rule

If any step fails before deployment, run npm run mainnet:approval:reset and stop.

## Post-deployment rule

Deployment does not approve treasury funding, public token sale, staking, rewards, buybacks, or autonomous execution.
