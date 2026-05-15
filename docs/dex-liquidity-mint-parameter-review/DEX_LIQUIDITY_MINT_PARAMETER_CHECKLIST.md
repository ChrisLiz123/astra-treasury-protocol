# DEX Liquidity Mint Parameter Review Checklist

## Required checks

- [x] Liquidity provision planning approval recorded.
- [x] Token approval requirements review completed.
- [x] Post-execution pool verification completed.
- [x] Pool liquidity remains zero.
- [x] tickLower is below tickUpper.
- [x] tickLower and tickUpper align to tick spacing.
- [x] Current tick is within the reviewed range.
- [x] amount0Desired and amount1Desired are positive.
- [x] amount0Min is not greater than amount0Desired.
- [x] amount1Min is not greater than amount1Desired.
- [x] Recipient is the reviewed Safe.
- [x] Deadline policy is recorded.
- [x] No mint calldata generated.
- [x] No liquidity Safe payload generated.
- [x] No liquidity added.
- [x] No position minted.
- [x] No funds moved.
- [x] Public trading not approved.
- [x] Full launch not approved.

## Required before liquidity payload generation

- [ ] Treasury funding approval recorded.
- [ ] Token approval payload generation approval recorded.
- [ ] Liquidity payload generation approval recorded.
- [ ] Operator liquidity command reviewed.
- [ ] Public status update prepared.

## Rule

This review does not approve or add liquidity.
