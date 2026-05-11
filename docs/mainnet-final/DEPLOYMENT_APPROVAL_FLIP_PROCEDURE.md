# Deployment Approval Flip Procedure

## Purpose

Define the controlled procedure for setting mainnetDeploymentApproved=true in the private mainnet production config.

## Current rule

Do not approve deployment unless you intend to run final preflight and guarded deployment in the same operator session.

## What this approval does

It allows the guarded deployment script to pass the private config approval check.

## What this approval does not do

- Does not deploy contracts by itself.
- Does not move funds.
- Does not fund treasury.
- Does not approve a public token sale.
- Does not approve staking, rewards, or buybacks.
- Does not import Safe payloads.

## Required before flipping approval

- Final signoff record completed.
- Deployment rehearsal review completed.
- Deployment day checklist reviewed.
- mainnet:final-go-no-go:gate passing.
- mainnet:commands:v1:gate passing.
- safe:payloads:v1:gate passing.
- audit:full passing.
- governance:gate:full passing.
- ops:status OK.
- domain:check OK.
- Deployer wallet has Base ETH for gas only.
- Deployer wallet holds no treasury assets.
- Governance Safe owners available.

## Approval command

ASTRA_CONFIRM_MAINNET_APPROVAL=YES npm run mainnet:approval:approve

## Reset command

npm run mainnet:approval:reset

## Final deployment command after approval

ASTRA_MAINNET_DEPLOYMENT_APPROVED=YES npm run deploy:base-mainnet:guarded

## Rule

If anything feels wrong after flipping approval, immediately run npm run mainnet:approval:reset.
