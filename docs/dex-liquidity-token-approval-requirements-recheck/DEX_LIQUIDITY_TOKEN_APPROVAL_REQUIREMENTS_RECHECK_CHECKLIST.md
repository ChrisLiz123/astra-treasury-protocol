# DEX Liquidity Token Approval Requirements Recheck Checklist

## Required checks

- [x] Funding transfer executed.
- [x] Treasury funds moved.
- [x] Destination liquidity Safe balances funded.
- [x] Current token balances checked.
- [x] Current token allowances checked.
- [x] Approval requirements determined.
- [x] Token approval payload not generated.
- [x] Token approval not executed.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required after recheck

- [ ] If approvals are required: token approval payload generation approval.
- [ ] If approvals are not required: liquidity mint calldata generation approval.

## Rule

Do not execute token approvals during this milestone.
