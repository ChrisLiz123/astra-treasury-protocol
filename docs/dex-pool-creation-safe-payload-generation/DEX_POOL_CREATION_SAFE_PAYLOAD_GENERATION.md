# DEX Pool Creation Safe Payload Generation

## Purpose

Generate encoded calldata and a local Safe payload file for DEX pool creation review.

## Current status

Encoded calldata generated: yes, after this milestone.

Safe payload generated: yes, after this milestone.

Safe transaction submitted: no.

Safe transaction executed: no.

Pool created: no.

Liquidity added: no.

Funds moved: no.

Public trading approved: no.

Full launch approved: no.

## Intended transaction

Target: Uniswap v3 NonfungiblePositionManager on Base.

Function: createAndInitializePoolIfNecessary(address,address,uint24,uint160)

Operation: CALL

Value: 0

## Rule

Payload generation is not Safe submission and is not Safe execution.
