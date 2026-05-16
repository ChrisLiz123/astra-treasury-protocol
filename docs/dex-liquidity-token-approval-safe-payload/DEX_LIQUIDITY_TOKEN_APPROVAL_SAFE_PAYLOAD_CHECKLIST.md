# DEX Liquidity Token Approval Safe Payload Checklist

## Required checks

- [x] Token approval payload generation approval recorded.
- [x] Token approval requirements recheck complete.
- [x] Token approvals required before liquidity.
- [x] Destination liquidity Safe balances funded.
- [x] Approval spender recorded.
- [x] Approval calldata generated.
- [x] Transaction Builder JSON generated.
- [x] Token approval not executed.
- [x] Liquidity calldata not generated.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required after payload generation

- [ ] Token approval Safe payload verification.
- [ ] Token approval Safe submission approval.
- [ ] Token approval Safe submission dry run.
- [ ] Token approval execution approval.

## Rule

Do not submit or execute this payload during generation.
