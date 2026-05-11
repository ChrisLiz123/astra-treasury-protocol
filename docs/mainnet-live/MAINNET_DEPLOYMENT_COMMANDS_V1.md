# Mainnet Deployment Commands v1

## Status

Command generation status: READY_FOR_COMMAND_REVIEW
Final deployment approval: PENDING_FINAL_GO_NO_GO

## Important

These are generated command templates only. They do not authorize deployment.

## Network

Base Mainnet

Chain ID: 8453

## Command files generated

- reports/mainnet-commands/commands/00-keystore-setup-template.sh
- reports/mainnet-commands/commands/01-preflight-template.sh
- reports/mainnet-commands/commands/02-deploy-guarded-template.sh
- reports/mainnet-commands/commands/03-verify-template.sh
- reports/mainnet-commands/commands/04-post-deployment-checks-template.sh

## Required command order

1. Review private mainnet config.
2. Run preflight template.
3. Only after final go/no-go, set mainnetDeploymentApproved=true in the private config.
4. Only after final go/no-go, run guarded deployment command.
5. Verify contracts.
6. Execute Safe-admin setup transactions.
7. Run post-deployment checks.

## Rule

Do not run the guarded deployment command until the final explicit go/no-go.
