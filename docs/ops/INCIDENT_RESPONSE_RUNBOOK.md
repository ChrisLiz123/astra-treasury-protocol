# AstraTreasury Incident Response Runbook

## Status

This runbook is for AstraTreasury testnet and future mainnet operations.

## Severity levels

SEV-1: treasury movement risk, compromised admin, active exploit, or unauthorized execution.
SEV-2: dashboard outage, paper loop outage, RPC outage, failed monitoring, or queue inconsistency.
SEV-3: documentation issue, non-critical API issue, or routine maintenance.

## First response checklist

1. Identify the incident type.
2. Preserve logs and reports.
3. Stop automated nonessential services if needed.
4. Confirm whether treasury funds are at risk.
5. Check contract pause status.
6. Check signer and role status.
7. Document every action taken.
8. Do not delete evidence.

## Immediate commands

npm run ops:status
npm run domain:check
npm run ops:incident-status
pm2 status

## Evidence locations

reports/ops/
reports/audit/
reports/paper-trading/
reports/execution-queue/
/var/log/nginx/

## Mainnet rule

If real funds are ever used, any SEV-1 requires immediate multisig coordination and emergency pause review.
