# DEX Pool Creation Safe Payload Verification Checklist

## Required checks

- [x] Generated Safe payload exists.
- [x] Payload hash matches payload contents.
- [x] Function selector matches createAndInitializePoolIfNecessary.
- [x] Calldata decodes to four arguments.
- [x] token0 matches reviewed token0.
- [x] token1 matches reviewed token1.
- [x] fee matches reviewed fee.
- [x] sqrtPriceX96 matches reviewed sqrtPriceX96.
- [x] Safe address matches Safe owners/threshold review.
- [x] Target address matches factory/router review.
- [x] Fresh no-pool recheck still shows no selected pool.
- [x] Safe transaction not submitted.
- [x] Safe transaction not executed.
- [x] Pool not created.
- [x] Liquidity not added.
- [x] Funds not moved.

## Required before Safe submission

- [ ] Fresh no-pool recheck immediately before submission.
- [ ] Safe submission approval recorded.
- [ ] Safe execution approval recorded.
- [ ] Public status update prepared.

## Rule

Do not submit or execute the Safe transaction during verification.
