# Safe Role Transfer Dry Run

## Purpose

This milestone prepares AstraTreasury for future Safe-based governance without deploying to mainnet.

## Current status

Mainnet deployment: not started
Real treasury funds: no
Public token sale: no

## Commands

npm run safe:plan:validate
npm run safe:dry-run:roles
npm run safe:prepare

## What the dry run tests

- Governance Safe-style address receives DEFAULT_ADMIN_ROLE.
- Deployer loses DEFAULT_ADMIN_ROLE.
- Signaler Safe-style address receives SIGNALER_ROLE.
- Executor Safe-style address receives ExecutionController.EXECUTOR_ROLE.
- ExecutionController remains the only direct TreasuryVault executor.
- Executor Safe-style address can execute through ExecutionController.
- Deployer cannot execute after role revocation.

## Mainnet rule

This dry run is not mainnet authorization. Real Safe addresses, thresholds, owners, audit signoff, legal signoff, and go/no-go approval are required before mainnet.
