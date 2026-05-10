# Monitoring and Alert Checklist

## Service monitoring

- astra-dashboard online.
- astra-public-site online.
- astra-paper-loop online.
- astra-ops-watchdog online.
- Nginx active.
- HTTPS certificate valid.

## Protocol monitoring

- TreasuryVault balance changes.
- ActionExecuted events.
- SignalSubmitted events.
- Pause status.
- Role changes.
- Policy config changes.

## Alert conditions

- Unexpected treasury movement.
- Unknown executor.
- Unknown signaler.
- Dashboard down.
- Public site down.
- Certificate near expiry.
- RPC failure.
- Queue item stuck in approved state.

## Current commands

npm run ops:status
npm run domain:check
npm run ops:incident-status
