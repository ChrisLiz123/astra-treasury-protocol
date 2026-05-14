# DEX Pool Creation Safe Payload Generation Checklist

## Required before generation

- [x] Payload generation approval recorded.
- [x] Fresh no-pool recheck completed.
- [x] Safe owners and threshold review completed.
- [x] Factory/router execution path review completed.
- [x] Token ordering and sqrtPriceX96 review completed.
- [x] Safe payload draft review completed.
- [x] Safe payload draft exists.
- [x] Mainnet monitor passing.
- [x] Active incidents zero.
- [x] Execution queue disabled.
- [x] Treasury funding not approved.
- [x] Safe transaction not prepared or submitted.
- [x] Pool not created.
- [x] Liquidity not added.
- [x] Funds not moved.
- [x] Full launch not approved.

## Required after generation before Safe submission or execution

- [ ] Payload reviewed.
- [ ] Fresh no-pool recheck immediately before submission.
- [ ] Safe submission approval recorded.
- [ ] Safe execution approval recorded.
- [ ] Public status update prepared.

## Rule

Do not submit or execute the Safe transaction during payload generation.
