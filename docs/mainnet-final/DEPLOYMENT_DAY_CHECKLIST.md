# Deployment Day Checklist

## Before running deployment

- [ ] Confirm mainnetDeploymentApproved=true.
- [ ] Confirm ASTRA_MAINNET_DEPLOYMENT_APPROVED=YES is intentionally set only for the deploy command.
- [ ] Confirm connected chain ID is 8453.
- [ ] Confirm deployer address matches config.
- [ ] Confirm primary RPC is working.
- [ ] Confirm backup RPC is working.
- [ ] Confirm CI passing.
- [ ] Confirm audit:full passing.
- [ ] Confirm governance:gate:full passing.
- [ ] Confirm ops:status OK.
- [ ] Confirm domain:check OK.

## During deployment

- [ ] Save terminal output.
- [ ] Record transaction hashes.
- [ ] Confirm deployment report is created.
- [ ] Do not import Safe payload until deployment report exists.

## After deployment

- [ ] Run post-deployment checks.
- [ ] Generate real Safe payloads.
- [ ] Review Safe payloads manually.
- [ ] Execute Safe setup transactions.
- [ ] Verify contracts on BaseScan.
- [ ] Update public manifest.
- [ ] Update public transparency pages.

## Rule

Deployment does not approve real treasury funding or public token sale.
