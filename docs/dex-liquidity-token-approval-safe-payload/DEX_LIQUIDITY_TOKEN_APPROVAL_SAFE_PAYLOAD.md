# DEX Liquidity Token Approval Safe Payload

## Purpose

Generate the local, reviewable Safe payload for ERC-20 approvals required before DEX liquidity can be minted.

## Current status after this milestone

Funding transfer executed: yes.

Destination liquidity Safe funded: yes.

Token approval requirements rechecked: yes.

Token approval payload generation approved: yes.

Token approval Safe payload generated: yes.

Token approval Safe transaction submitted: no.

Token approval executed: no.

Liquidity calldata generated: no.

Liquidity added: no.

Position minted: no.

Public trading approved: no.

Full launch approved: no.

## Payload contents

- Liquidity Safe address.
- Approval spender.
- ERC-20 approve calldata.
- Approval token list.
- Recommended approval amounts.
- Transaction Builder JSON.
- Payload hash.

## Rule

Payload generation is not approval execution.
