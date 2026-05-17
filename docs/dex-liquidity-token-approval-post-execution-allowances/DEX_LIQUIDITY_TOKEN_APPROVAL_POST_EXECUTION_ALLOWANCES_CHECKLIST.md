# DEX Liquidity Token Approval Post-Execution Allowance Verification Checklist

## Required checks

- [x] Token approval Safe execution live evidence recorded.
- [x] Token approval executed evidence recorded.
- [x] Safe transaction executed.
- [x] Current allowances equal or cover required approval amounts.
- [x] Current balances still cover intended liquidity amounts.
- [x] Pool liquidity remains zero.
- [x] Liquidity calldata not generated.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required after verification

- [ ] Liquidity mint calldata generation approval.
- [ ] Liquidity mint calldata generation.
- [ ] Liquidity Safe payload generation approval.

## Rule

Do not add liquidity during this milestone.
