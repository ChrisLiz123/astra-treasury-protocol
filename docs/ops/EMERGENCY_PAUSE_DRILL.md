# Emergency Pause Drill

## Purpose

Practice emergency response without improvising during an incident.

## Drill frequency

Recommended: monthly on testnet before any mainnet launch.

## Drill scope

- Confirm which contracts are pausable.
- Confirm who can pause.
- Confirm who can unpause.
- Confirm dashboards report pause state.
- Confirm execution is blocked while paused.

## Dry-run checklist

1. Run ops status.
2. Identify current pause status.
3. Confirm admin or Safe ownership.
4. Pause the testnet target contract if performing a live testnet drill.
5. Confirm dashboard pause state.
6. Attempt expected blocked action on testnet only.
7. Unpause after approval.
8. Record timestamps, tx hashes, and signer decisions.

## Mainnet rule

Never run a mainnet pause drill without a written approval record and signer coordination.
