# DEX Liquidity Safe Payload Verification Checklist

## Required checks

- [x] Liquidity Safe payload generated.
- [x] Transaction Builder JSON generated.
- [x] Safe payload hash verified.
- [x] Transaction Builder hash verified.
- [x] Mint calldata hash verified.
- [x] Transaction target verified.
- [x] Transaction data verified.
- [x] Live balances cover desired amounts.
- [x] Live allowances cover desired amounts.
- [x] Pool liquidity remains zero.
- [x] Liquidity Safe transaction not submitted.
- [x] Liquidity Safe transaction not executed.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required after verification

- [ ] Liquidity Safe submission approval.
- [ ] Liquidity Safe submission preparation.
- [ ] Liquidity Safe submission dry run.
- [ ] Liquidity Safe submission live.

## Rule

Do not submit or execute the Safe payload during this milestone.
