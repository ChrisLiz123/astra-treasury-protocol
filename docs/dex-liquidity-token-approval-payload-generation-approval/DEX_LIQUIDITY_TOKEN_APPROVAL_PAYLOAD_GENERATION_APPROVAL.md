# DEX Liquidity Token Approval Payload Generation Approval

## Purpose

Record approval to generate the later token-approval Safe payload required before DEX liquidity can be minted.

## Current status

Funding transfer executed: yes.

Destination liquidity Safe funded: yes.

Token approval requirements rechecked: yes.

Token approvals required before liquidity: yes.

Token approval payload generation approval: pending or recorded.

Token approval payload generated: no.

Token approval executed: no.

Liquidity added: no.

Position minted: no.

Public trading approved: no.

Full launch approved: no.

## What this approval can approve

- Proceeding to a later token-approval Safe payload generation step.
- Using the rechecked token approval requirements.
- Using the recorded approval spender.
- Generating a reviewable token-approval Safe payload in the next milestone.

## What this approval does not do

- Generate token approval calldata now.
- Generate a Safe payload now.
- Submit or execute a Safe transaction.
- Execute token approvals.
- Generate liquidity calldata.
- Add liquidity.
- Mint a position.
- Enable public trading.
- Activate the buy page.
- Approve full launch.

## Rule

Token approval payload generation approval is not payload generation and is not approval execution.
