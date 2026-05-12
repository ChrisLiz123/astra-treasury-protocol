# Role Change Response

## Trigger

RoleGranted or RoleRevoked appears on monitored contracts.

## Severity

HIGH

## Immediate response

1. Confirm event on BaseScan.
2. Identify role hash.
3. Identify account granted or revoked.
4. Identify transaction sender.
5. Confirm whether Governance Safe approved it.
6. Re-run mainnet monitor.
7. Record incident notes.

## Rule

No direct EOA should receive TreasuryVault execution authority.
