# Mainnet Deployment Abort Plan

## Abort triggers before deployment

- Wrong chain ID.
- Wrong deployer address.
- Deployer has insufficient gas.
- mainnet:final-preflight fails.
- audit:full fails.
- governance:gate:full fails.
- ops:status fails.
- domain:check fails.
- Any signer unavailable.
- Any uncertainty about final approval.

## Abort command

npm run mainnet:approval:reset

## Abort documentation

Record:
- timestamp
- failed command
- terminal output
- whether any transaction was sent
- next remediation action

## Rule

If deployment has not started, abort cleanly and do not retry until the issue is understood.
