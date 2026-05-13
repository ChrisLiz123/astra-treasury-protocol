# Treasury Transaction Dry-Run Cases

## Case 1: Missing treasury risk limits

Expected result: blocked.

Reason: treasury risk limits are not approved.

## Case 2: Missing funding source approval

Expected result: blocked.

Reason: funding source is not approved.

## Case 3: Missing Treasury Safe approval

Expected result: blocked.

Reason: Treasury Safe approval is not recorded.

## Case 4: Missing public disclosure approval

Expected result: blocked.

Reason: public disclosure update is drafted but not final-approved.

## Case 5: Zero effective funding limits

Expected result: blocked.

Reason: effective funding limits remain zero.

## Case 6: Attempt to generate Safe payload

Expected result: blocked.

Reason: this dry run must not generate a Safe transaction payload.

## Rule

Every case must remain blocked until separate approval milestones complete.
