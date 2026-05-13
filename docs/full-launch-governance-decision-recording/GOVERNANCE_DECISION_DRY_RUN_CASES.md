# Governance Decision Recording Dry-Run Cases

## Case 1: Missing vote result

Expected result: blocked.

Reason: vote result is not recorded.

## Case 2: Missing signed resolution

Expected result: blocked.

Reason: governance resolution is not signed.

## Case 3: Missing decision-recording authorization

Expected result: blocked.

Reason: final decision-recording authorization is not recorded.

## Case 4: Missing capability matrix

Expected result: blocked.

Reason: capability matrix is not final-approved.

## Case 5: Decision recording attempt

Expected result: blocked.

Reason: this package must not record a decision.

## Case 6: Full-launch approval attempt

Expected result: blocked.

Reason: this package must not approve full launch.

## Case 7: Capability approval attempt

Expected result: blocked.

Reason: this package must not approve any capability.

## Case 8: Public status publication attempt

Expected result: blocked.

Reason: this package must not publish final approval status.

## Rule

All dry-run cases must remain blocked.
