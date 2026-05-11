# Deployment Approval Session Checklist

## Before approval

- [ ] Final signoff record says APPROVED.
- [ ] Governance Safe owners are available.
- [ ] Deployer wallet address matches private config.
- [ ] Deployer wallet has Base ETH for gas only.
- [ ] Deployer private key is available only for deployment.
- [ ] Primary Base Mainnet RPC tested.
- [ ] Backup Base Mainnet RPC tested.
- [ ] npm run mainnet:final-go-no-go:gate passed.
- [ ] npm run mainnet:commands:v1:gate passed.
- [ ] npm run safe:payloads:v1:gate passed.

## Approval step

- [ ] Run ASTRA_CONFIRM_MAINNET_APPROVAL=YES npm run mainnet:approval:approve.
- [ ] Confirm mainnet:config:validate passes.
- [ ] Confirm approval report generated.

## If proceeding to deployment

- [ ] Run final preflight.
- [ ] Run guarded deployment command.
- [ ] Save terminal logs.
- [ ] Confirm deployment report exists.

## If not proceeding immediately

- [ ] Run npm run mainnet:approval:reset.
- [ ] Confirm mainnetDeploymentApproved=false.
