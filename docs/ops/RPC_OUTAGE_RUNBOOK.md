# RPC Outage Runbook

## Trigger conditions

- Dashboard cannot read chain state.
- Queue cannot sync.
- Transaction submission fails.
- RPC latency or rate-limit errors.

## Immediate response

1. Confirm local services are online.
2. Confirm Nginx and public site are online.
3. Test primary RPC.
4. Switch read-only services to backup RPC if configured.
5. Do not submit treasury execution transactions during unstable RPC conditions.
6. Record provider errors and timestamps.

## Commands

npm run ops:status
npm run domain:check
curl -s http://127.0.0.1:8787/api/health
curl -s http://127.0.0.1:8790/healthz

## Mainnet rule

Mainnet requires primary and backup RPC providers before real treasury operation.
