# Pause / Unpause Event Response

## Trigger

Paused or Unpaused event appears on monitored contracts.

## Severity

HIGH

## Immediate response

1. Confirm event on BaseScan.
2. Identify contract.
3. Identify transaction sender.
4. Confirm whether pause/unpause was expected.
5. Notify governance/operators.
6. Re-run monitor and post-deployment role checks if needed.

## Rule

Unexpected pause/unpause activity requires incident review.
