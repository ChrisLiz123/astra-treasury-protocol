# Vault Outflow Response

## Trigger

The event monitor detects ASTP moving out of TreasuryVault.

## Severity

CRITICAL

## Immediate response

1. Preserve monitor report.
2. Confirm transaction on BaseScan.
3. Identify recipient.
4. Identify transaction sender/path.
5. Notify Governance Safe owners.
6. Notify Treasury Safe owners.
7. Check whether the transaction was approved through ExecutionController.
8. Check whether ExecutionController role state is expected.
9. Decide whether emergency pause or role revocation is required.
10. Record incident notes.

## Rule

During restricted mode, any TreasuryVault outflow must be treated as critical until explained.
