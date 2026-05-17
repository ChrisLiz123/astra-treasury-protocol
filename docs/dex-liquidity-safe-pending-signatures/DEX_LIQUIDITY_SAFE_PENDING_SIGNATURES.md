# DEX Liquidity Safe Pending Signatures Monitoring

## Purpose

Monitor the submitted/proposed DEX liquidity Safe transaction until the required Safe threshold is reached.

## Current status after this milestone

Liquidity Safe transaction submitted/proposed: yes.

Pending signatures monitoring: complete.

Threshold reached: active or reached depending on confirmations.

Liquidity Safe transaction executed: no.

Liquidity added: no.

Position minted on-chain: no.

Public trading approved: no.

Full launch approved: no.

## Monitoring checks

- Safe Transaction Service transaction exists.
- Safe tx hash and nonce match the recorded live submission.
- Transaction target, value, and calldata match the verified payload.
- Confirmation count is recorded.
- Required threshold is recorded.
- Missing confirmations are recorded.
- Transaction is not executed.
- Pool liquidity remains zero.

## Rule

Pending signature monitoring is not Safe execution and is not liquidity provision.
