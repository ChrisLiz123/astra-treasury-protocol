# DEX Liquidity Mint Calldata Verification

## Purpose

Verify the generated local Uniswap V3 mint calldata before any liquidity Safe payload is generated.

## Current status after this milestone

Liquidity mint calldata generated: yes.

Liquidity mint calldata verified: yes.

Liquidity Safe payload generated: no.

Liquidity Safe transaction submitted: no.

Liquidity Safe transaction executed: no.

Liquidity added: no.

Position minted on-chain: no.

Public trading approved: no.

Full launch approved: no.

## Verification areas

- Calldata hash.
- Calldata artifact hash.
- Function selector.
- Decoded mint parameters.
- NonfungiblePositionManager target.
- Liquidity Safe recipient.
- Tick range and tick spacing.
- Desired and minimum amounts.
- Live balances.
- Live allowances.
- Pool liquidity remains zero.

## Rule

Calldata verification is not liquidity provision.
