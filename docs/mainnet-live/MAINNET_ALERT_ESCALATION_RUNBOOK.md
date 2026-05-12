# Mainnet Alert Escalation Runbook v1

## Status

AstraTreasury is in restricted Base Mainnet operation.

## Purpose

Define how operators respond to read-only mainnet monitor alerts.

## Alert severities

### CRITICAL

Examples:

- TreasuryVault ASTP outflow during restricted mode
- Unexpected treasury movement
- Confirmed unauthorized transaction

Response:

1. Preserve evidence.
2. Confirm transaction on BaseScan.
3. Notify Governance Safe owners.
4. Notify Treasury Safe owners.
5. Review whether emergency pause or role revocation is required.
6. Do not enable any additional restricted capability.
7. Open incident record.

### HIGH

Examples:

- RoleGranted event
- RoleRevoked event
- Paused event
- Unpaused event
- Restricted flag unexpectedly enabled

Response:

1. Confirm whether the event was authorized.
2. Record transaction hash.
3. Review current role state.
4. Notify governance/operator reviewers.
5. Update incident notes.

### WARN

Examples:

- RPC/log-query error
- Monitor degraded
- Missing public status file

Response:

1. Check primary RPC.
2. Check backup RPC.
3. Re-run monitor.
4. Escalate if repeated.

## Mainnet restrictions

The following remain disabled:

- Public token sale
- Real treasury funding
- Staking or rewards
- Buyback program
- Autonomous execution
- Mainnet execution queue

## Rule

No alert response should enable restricted capabilities without a separate governance/legal/security approval milestone.
