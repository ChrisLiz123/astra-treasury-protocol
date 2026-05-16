# DEX Liquidity Token Approval Safe Submission Dry Run Checklist

## Required checks

- [x] Token approval Safe submission preparation complete.
- [x] Token approval Safe submission approval recorded.
- [x] Token approval Safe payload verified.
- [x] Transaction Builder JSON verified.
- [x] Approval calldata verified.
- [x] Liquidity Safe reviewed.
- [x] Approval spender reviewed.
- [x] Current allowances still show no approval execution.
- [x] Token approval Safe transaction not submitted.
- [x] Token approval not executed.
- [x] Liquidity calldata not generated.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required before live submission

- [ ] Public status update prepared.
- [ ] Operator submits/proposes only the verified token-approval Safe payload.
- [ ] Operator stops before execution.

## Rule

Do not submit or execute the token approval Safe payload during dry run.
