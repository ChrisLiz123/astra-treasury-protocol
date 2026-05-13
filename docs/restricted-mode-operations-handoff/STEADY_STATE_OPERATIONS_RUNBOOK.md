# Steady-State Operations Runbook

## Daily / routine checks

1. Confirm mainnet monitor is passing.
2. Confirm alerts do not require response.
3. Confirm active incidents are zero.
4. Confirm public status pages are reachable.
5. Confirm execution queue remains disabled.
6. Confirm treasury funding remains not approved.
7. Confirm Safe payload remains not generated.

## After any material status change

1. Run public refresh.
2. Run evidence archive.
3. Re-run restricted-mode final release gate.
4. Re-run operations handoff gate.
5. Commit and publish updated public status artifacts.

## If an incident occurs

1. Open an incident record.
2. Do not activate any capability.
3. Update public status if material.
4. Resolve or document the incident.
5. Archive evidence.

## Rule

Restricted-mode operations are steady state only. No capability activation is implied.
