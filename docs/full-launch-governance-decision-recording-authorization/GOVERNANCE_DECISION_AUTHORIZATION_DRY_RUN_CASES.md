# Governance Decision Authorization Dry-Run Cases

## Case 1: Missing vote result

Expected result: blocked.

Reason: vote result is not recorded.

## Case 2: Missing signed resolution

Expected result: blocked.

Reason: governance resolution is not signed.

## Case 3: Missing resolution signing authorization

Expected result: blocked.

Reason: resolution signing authorization is not recorded.

## Case 4: Missing capability matrix

Expected result: blocked.

Reason: capability matrix is not final-approved.

## Case 5: Missing decision recorder

Expected result: blocked.

Reason: decision recorder is not assigned.

## Case 6: Authorization recording attempt

Expected result: blocked.

Reason: this package must not record authorization.

## Case 7: Governance decision record attempt

Expected result: blocked.

Reason: this package must not record a governance decision.

## Case 8: Full-launch approval attempt

Expected result: blocked.

Reason: this package must not approve full launch.

## Case 9: Capability approval attempt

Expected result: blocked.

Reason: this package must not approve any capability.

## Rule

All dry-run cases must remain blocked.
