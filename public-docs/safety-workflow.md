# Safety Workflow

AstraTreasury uses two separate human approval layers.

## Layer 1: Signal approval

```text
Paper-trading signal
→ NEW
→ APPROVED or REJECTED
→ submitted to SignalRegistry only after manual approval
```

## Layer 2: Execution approval

```text
On-chain signal
→ execution proposal
→ live TreasuryPolicy check
→ POLICY_PASSED or POLICY_BLOCKED
→ APPROVED_FOR_EXECUTION or REJECTED
→ guarded execution command
```

## Guardrails

- Dashboard is read-only.
- Paper loop does not use private keys.
- AI signals are not orders.
- Signal submission does not move funds.
- Treasury execution requires a separate queue approval.
- Execution is checked against the live TreasuryPolicy contract before transaction submission.
- Current execution test amount is intentionally tiny on Base Sepolia.
