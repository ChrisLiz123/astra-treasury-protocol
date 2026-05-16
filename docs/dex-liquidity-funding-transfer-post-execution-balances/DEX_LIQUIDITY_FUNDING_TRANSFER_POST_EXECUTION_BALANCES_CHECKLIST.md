# DEX Liquidity Funding Transfer Post-Execution Balance Verification Checklist

## Required checks

- [x] Funding-transfer Safe execution live evidence recorded.
- [x] Funds moved evidence recorded.
- [x] Safe transaction executed.
- [x] Execution transaction hash recorded.
- [x] Source token balances moved as expected.
- [x] Destination liquidity Safe balances funded as expected.
- [x] Pool liquidity remains zero.
- [x] Token approval not executed.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required after verification

- [ ] Recheck token approval requirements.
- [ ] Record token approval payload generation approval if approvals are still required.
- [ ] Record liquidity payload generation approval only after approvals are ready.

## Rule

Do not add liquidity or approve public trading during this milestone.
