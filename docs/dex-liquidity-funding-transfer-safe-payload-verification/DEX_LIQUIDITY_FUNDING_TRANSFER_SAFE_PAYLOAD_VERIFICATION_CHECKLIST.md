# DEX Liquidity Funding Transfer Safe Payload Verification Checklist

## Required checks

- [x] Funding-transfer Safe payload generated.
- [x] Payload hash verified.
- [x] Source Safe address verified.
- [x] Destination Safe address verified.
- [x] ERC-20 transfer calldata verified.
- [x] Transfer amounts match approved shortfalls.
- [x] Source balances cover transfers.
- [x] Destination balances unchanged from requirements review.
- [x] Payload not submitted.
- [x] Funding transfer not executed.
- [x] Treasury funds not moved.
- [x] Token approval not executed.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required after verification

- [ ] Safe submission approval.
- [ ] Operator submission command reviewed.
- [ ] Public status update prepared.

## Rule

Do not submit or execute the payload during verification.
