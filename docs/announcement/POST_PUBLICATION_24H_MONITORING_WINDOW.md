# Post-Publication 24-Hour Monitoring Window

## Purpose

Track the first 24 hours after publishing the restricted mainnet deployment announcement.

## Status

This workflow monitors public links, mainnet monitoring, alerts, incidents, evidence snapshots, and restricted launch status.

## Requirements during the window

- Announcement publication is logged.
- Required public links are reachable.
- Mainnet monitor is passing.
- Event monitor has no high or critical alerts.
- Alert status does not require response.
- No active incidents remain unresolved.
- Restricted launch status remains ready.
- Evidence snapshots are captured.
- Restricted capabilities remain disabled.

## Still disabled

- Public token sale.
- Real treasury funding.
- Staking or rewards.
- Buyback program.
- Autonomous execution.
- Mainnet execution queue.

## Rule

If any high/critical alert or active incident appears, pause public follow-up messaging until operators review and acknowledge it.
