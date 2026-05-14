# DEX Factory/Router Review Checklist

## Required checks

- [x] Token ordering and sqrtPriceX96 review completed.
- [x] Safe payload draft review completed.
- [x] Safe payload draft is non-executable.
- [x] NonfungiblePositionManager target identified.
- [x] NonfungiblePositionManager contract code checked.
- [x] factory() mapping checked.
- [x] Factory getPool checked read-only.
- [x] No selected pool exists.
- [x] SwapRouter not required for pool creation only.
- [x] ERC20 token approvals not required for pool creation only.
- [x] Safe payload not generated.
- [x] Safe transaction not prepared.
- [x] Pool not created.
- [x] Liquidity not added.

## Required before payload generation

- [ ] Safe owners and threshold reviewed.
- [ ] Fresh no-pool recheck completed.
- [ ] Safe payload generation approval recorded.
- [ ] Public status update prepared.

## Rule

This review does not generate a Safe payload.
