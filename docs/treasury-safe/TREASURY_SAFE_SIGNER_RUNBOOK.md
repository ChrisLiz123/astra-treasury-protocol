# Treasury Safe Signer Runbook

## Purpose

Guide Treasury Safe owners through future funding approval review.

## Before signing

1. Confirm the transaction was expected.
2. Confirm the Safe is on Base Mainnet.
3. Confirm the destination address.
4. Confirm the asset and amount.
5. Confirm the transaction was generated from an approved package.
6. Confirm risk limits and funding source approval.
7. Confirm public disclosures are current.
8. Confirm mainnet monitor is passing.
9. Confirm no active incidents.
10. Confirm no additional calls are bundled.

## During signing

- Review decoded calldata.
- Review Safe nonce.
- Review signer threshold.
- Review every transaction in the batch.
- Do not sign under time pressure.

## After execution

- Save transaction hash.
- Run monitor checks.
- Archive evidence snapshot.
- Update public funding status.

## Rule

Safe signing is a control point, not a rubber stamp.
