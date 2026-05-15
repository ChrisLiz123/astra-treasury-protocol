# DEX Treasury Funding Approval for Liquidity Provision

## Purpose

Record scoped approval for the treasury funding/allocation path needed for the reviewed DEX liquidity mint amounts.

## Current status

Pool created: yes.

Pool verified: yes.

Pool liquidity: zero.

Mint parameters reviewed: yes.

Token approval requirements reviewed: yes.

DEX liquidity treasury funding approval: pending or recorded.

Funding transfer executed: no.

Token approvals executed: no.

Liquidity added: no.

Position minted: no.

Public trading approved: no.

Full launch approved: no.

## What this approval can approve

- Proceeding into the later funding-transfer or token-approval payload preparation path.
- Using the reviewed mint parameter amounts as the basis for funding requirements.
- Recording whether the current Safe balances already cover the reviewed mint amounts.
- Recording whether additional funding is required before liquidity can be added.

## What this approval does not approve

- Moving treasury funds.
- Generating or executing funding transfer payloads.
- Executing token approvals.
- Generating liquidity mint calldata.
- Submitting or executing Safe transactions.
- Adding liquidity.
- Minting a position.
- Public trading.
- Buy page activation.
- Full launch.

## Rule

Funding approval is not funding execution and is not liquidity provision.
