# Mainnet Dry-Run Deployment Runbook

## Status

This is a dry-run-only runbook.

Mainnet deployment: not authorized
Real treasury funds: no
Public token sale: no
Investment product: no

## Purpose

Prepare the exact sequence required for a future Base Mainnet deployment without executing it.

## Required before any real deployment

- External audit completed
- Audit remediations completed
- Legal review completed
- Safe multisig addresses finalized
- Dedicated Base Mainnet RPC configured
- Incident response runbook approved
- Go or no-go checklist completed

## Dry-run phases

1. Freeze source code and tag audit candidate.
2. Generate constructor argument manifest.
3. Confirm Safe role plan.
4. Rehearse deployment locally.
5. Rehearse deployment on Base Sepolia.
6. Confirm verification plan.
7. Confirm rollback and pause plan.
8. Collect signoff from security, legal, and operations.

## Mainnet rule

No Base Mainnet transaction should be sent from this runbook.
