# DEX Liquidity Mint Parameter Review

## Purpose

Review the Uniswap v3 liquidity mint parameters before any mint calldata or Safe payload generation.

## Current status

Pool created: yes.

Pool verified: yes.

Pool liquidity: zero.

Token approval requirements reviewed: yes.

Mint parameters reviewed: yes, after this milestone.

Mint calldata generated: no.

Liquidity Safe payload generated: no.

Liquidity added: no.

Position minted: no.

Funds moved: no.

Public trading approved: no.

Full launch approved: no.

## Review areas

- Pool address.
- token0/token1.
- fee tier.
- tick spacing.
- current pool tick.
- tickLower and tickUpper.
- amount0Desired and amount1Desired.
- amount0Min and amount1Min.
- recipient.
- deadline policy.
- current Safe balances.
- current allowances to NonfungiblePositionManager.

## Rule

Mint parameter review is not liquidity provision.
