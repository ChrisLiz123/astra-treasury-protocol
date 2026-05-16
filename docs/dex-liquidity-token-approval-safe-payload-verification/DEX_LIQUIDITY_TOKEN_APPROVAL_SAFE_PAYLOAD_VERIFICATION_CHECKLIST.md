# DEX Liquidity Token Approval Safe Payload Verification Checklist

## Required checks

- [x] Token approval Safe payload generated.
- [x] Transaction Builder JSON generated.
- [x] Payload hash verified.
- [x] Transaction Builder hash verified.
- [x] Approval calldata decoded and verified.
- [x] Approval spender verified.
- [x] Approval amounts verified.
- [x] Token approval Safe transaction not submitted.
- [x] Token approval not executed.
- [x] Liquidity calldata not generated.
- [x] Liquidity not added.
- [x] Position not minted.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required after verification

- [ ] Token approval Safe submission approval.
- [ ] Token approval Safe submission dry run.
- [ ] Token approval Safe submission live.
- [ ] Token approval execution approval.

## Rule

Do not submit or execute the token approval payload during verification.
