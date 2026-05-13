# Governance Resolution Authorization Dry-Run Cases

## Case 1: Missing completed vote

Expected result: blocked.

Reason: governance vote is not completed.

## Case 2: Missing vote result

Expected result: blocked.

Reason: vote result is not recorded.

## Case 3: Missing final resolution text

Expected result: blocked.

Reason: resolution text is not final-approved.

## Case 4: Missing capability matrix

Expected result: blocked.

Reason: capability matrix is not final-approved.

## Case 5: Missing signer list

Expected result: blocked.

Reason: signer list is not confirmed.

## Case 6: Authorization recording attempt

Expected result: blocked.

Reason: this package must not record authorization.

## Case 7: Resolution signing attempt

Expected result: blocked.

Reason: this package must not sign a resolution.

## Case 8: Governance decision record attempt

Expected result: blocked.

Reason: no signed resolution or vote result exists.

## Case 9: Capability approval attempt

Expected result: blocked.

Reason: this package must not approve any capability.

## Rule

All dry-run cases must remain blocked.
