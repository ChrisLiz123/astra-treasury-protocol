# RPC and Infrastructure Provider Plan

## Goal

Do not rely on public RPC endpoints for production treasury operations.

## Required environments

| Environment | Network | Purpose |
|---|---|---|
| testnet | Base Sepolia | development and rehearsals |
| mainnet-readonly | Base Mainnet | monitoring and dashboards |
| mainnet-operator | Base Mainnet | deployment and signed transactions |
| backup-readonly | Base Mainnet | failover checks |

## Provider requirements

- Dedicated Base Mainnet endpoint
- Dedicated Base Sepolia endpoint
- Event-log reliability
- Reasonable rate limits
- API key management
- Usage alerts
- Separate read-only and operator RPC keys if supported
- Backup provider configured

## Candidate provider categories

- Coinbase Developer Platform
- Alchemy
- QuickNode
- Chainstack
- Ankr
- Self-hosted node for future phase

## Mainnet rule

No mainnet deployment until a dedicated provider and backup provider are configured.
