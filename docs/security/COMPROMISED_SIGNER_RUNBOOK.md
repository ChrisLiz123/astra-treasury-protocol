# Compromised Signer Runbook

## Trigger conditions

- Lost hardware wallet.
- Suspected private key leak.
- Unauthorized signature.
- Malware on signer machine.
- Unexpected role change.

## Immediate response

1. Mark signer as compromised.
2. Stop using the signer immediately.
3. Preserve logs and wallet activity.
4. Review roles controlled by the signer.
5. Rotate signer through Safe or admin process.
6. Revoke direct roles if any exist.
7. Check for unauthorized transactions.
8. Publish incident note if public trust is affected.

## Role review

Check DEFAULT_ADMIN_ROLE, EXECUTOR_ROLE, SIGNALER_ROLE, and any Safe owner membership.

## Mainnet rule

No single signer should be able to move treasury funds.
