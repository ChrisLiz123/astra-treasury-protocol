# Treasury Safe Payload Review Checklist

## Before payload generation

- [ ] Treasury disclosure final-approved.
- [ ] Treasury risk limits approved.
- [ ] Funding source approved.
- [ ] Treasury Safe approval recorded.
- [ ] Governance approval recorded.
- [ ] Treasury funding approved.
- [ ] Mainnet monitor passing.
- [ ] No active incidents.
- [ ] Destination verified.
- [ ] Asset verified.
- [ ] Amount verified.
- [ ] Safe nonce reviewed.

## Payload review

- [ ] Transaction target decoded.
- [ ] Calldata decoded.
- [ ] Asset transfer path verified.
- [ ] Amount matches approval record.
- [ ] Destination matches approval record.
- [ ] No unexpected batched transactions.
- [ ] No unrelated calls.
- [ ] No execution queue activation included.
- [ ] No autonomous execution included.

## Rule

Do not submit or sign a payload unless every item is complete.
