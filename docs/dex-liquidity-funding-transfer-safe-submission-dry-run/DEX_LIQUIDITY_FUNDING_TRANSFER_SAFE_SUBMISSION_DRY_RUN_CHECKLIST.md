# DEX Liquidity Funding Transfer Safe Submission Dry Run Checklist

## Required checks

- [x] Safe submission preparation complete.
- [x] Safe submission approval recorded.
- [x] Funding-transfer payload verified.
- [x] Payload hash verified.
- [x] Source Safe verified.
- [x] Destination Safe verified.
- [x] Transaction-builder fields checked.
- [x] Source balances cover transfers.
- [x] Destination balances unchanged.
- [x] Funding transfer not submitted.
- [x] Funding transfer not executed.
- [x] Treasury funds not moved.
- [x] Token approval not executed.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required before live submission

- [ ] Public status update prepared.
- [ ] Operator submits/proposes only the verified Safe payload.
- [ ] Operator stops before execution.

## Rule

Do not submit or execute the payload during dry run.
