# DEX Liquidity Mint Calldata Generation Checklist

## Required checks

- [x] Liquidity mint calldata generation approval recorded.
- [x] Token approval post-execution allowances verified.
- [x] Required allowances available.
- [x] Required balances available.
- [x] Pool liquidity remains zero.
- [x] Mint calldata generated locally.
- [x] Mint calldata hash recorded.
- [x] Liquidity Safe payload not generated.
- [x] Liquidity Safe transaction not submitted.
- [x] Liquidity not added.
- [x] Position not minted on-chain.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required after calldata generation

- [ ] Liquidity mint calldata verification.
- [ ] Liquidity Safe payload generation approval.
- [ ] Liquidity Safe payload generation.
- [ ] Liquidity Safe submission approval.

## Rule

Do not submit or execute liquidity during this milestone.
