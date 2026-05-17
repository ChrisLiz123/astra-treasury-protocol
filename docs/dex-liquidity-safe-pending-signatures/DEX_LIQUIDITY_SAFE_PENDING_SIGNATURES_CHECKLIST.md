# DEX Liquidity Safe Pending Signatures Monitoring Checklist

## Required checks

- [x] Liquidity Safe submission live recorded.
- [x] Safe tx hash recorded.
- [x] Safe nonce recorded.
- [x] Safe Transaction Service transaction found.
- [x] Transaction matches verified payload.
- [x] Confirmation count recorded.
- [x] Required threshold recorded.
- [x] Transaction not executed.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required before execution approval

- [ ] Threshold reached.
- [ ] Missing confirmation count is zero.
- [ ] Safe transaction still not executed.

## Rule

Do not execute the Safe transaction during this monitoring milestone.
