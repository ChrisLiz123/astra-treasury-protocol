# DEX Liquidity Mint Calldata Verification Checklist

## Required checks

- [x] Liquidity mint calldata generated.
- [x] Calldata hash verified.
- [x] Calldata artifact hash verified.
- [x] Mint selector verified.
- [x] Decoded mint parameters verified.
- [x] NonfungiblePositionManager target verified.
- [x] Live balances cover desired amounts.
- [x] Live allowances cover desired amounts.
- [x] Pool liquidity remains zero.
- [x] Liquidity Safe payload not generated.
- [x] Liquidity transaction not submitted.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required after verification

- [ ] Liquidity Safe payload generation approval.
- [ ] Liquidity Safe payload generation.
- [ ] Liquidity Safe payload verification.
- [ ] Liquidity Safe submission approval.

## Rule

Do not generate a liquidity Safe payload or add liquidity during this milestone.
