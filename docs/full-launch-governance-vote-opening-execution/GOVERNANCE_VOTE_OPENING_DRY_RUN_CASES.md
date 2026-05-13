# Governance Vote Opening Dry-Run Cases

## Case 1: Missing vote authorization

Expected result: blocked.

Reason: governance vote authorization is not recorded.

## Case 2: Missing final vote scope

Expected result: blocked.

Reason: vote scope is not final-approved.

## Case 3: Missing final public notice

Expected result: blocked.

Reason: public vote notice is not final-approved.

## Case 4: Missing evidence plan approval

Expected result: blocked.

Reason: evidence plan is not final-approved.

## Case 5: Vote URL creation attempt

Expected result: blocked.

Reason: this package must not create a vote URL.

## Case 6: Public notice publication attempt

Expected result: blocked.

Reason: this package must not publish a vote notice.

## Case 7: Governance decision record attempt

Expected result: blocked.

Reason: no vote has been opened or completed.

## Rule

All dry-run cases must remain blocked.
