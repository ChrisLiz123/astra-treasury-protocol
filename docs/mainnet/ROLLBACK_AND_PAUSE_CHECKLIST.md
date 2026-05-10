# Rollback and Pause Checklist

## Purpose

Define what to do if a deployment or post-deployment check fails.

## Deployment failure

- [ ] Stop further transactions.
- [ ] Preserve logs.
- [ ] Record failed transaction hashes.
- [ ] Do not fund treasury.
- [ ] Do not announce launch.
- [ ] Review constructor arguments.
- [ ] Review roles.
- [ ] Decide whether redeployment is required.

## Post-deployment failure

- [ ] Check pause status.
- [ ] Pause affected contracts if needed.
- [ ] Revoke unsafe roles if needed.
- [ ] Stop paper-to-on-chain submission process if needed.
- [ ] Stop execution queue if needed.
- [ ] Publish incident note if public trust is affected.

## Mainnet rule

If any safety check fails, mainnet launch remains blocked.
