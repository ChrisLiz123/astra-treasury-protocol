# Mainnet Role Transfer Checklist

## Purpose

Ensure no deployer or single EOA keeps unsafe authority after deployment.

## Checklist

- [ ] Governance Safe address confirmed.
- [ ] Treasury Safe address confirmed.
- [ ] Executor Safe address confirmed.
- [ ] Signaler Safe address confirmed.
- [ ] Deployer wallet identified.
- [ ] TreasuryPolicy DEFAULT_ADMIN_ROLE granted to Governance Safe.
- [ ] TreasuryVault DEFAULT_ADMIN_ROLE granted to Governance Safe.
- [ ] SignalRegistry DEFAULT_ADMIN_ROLE granted to Governance Safe.
- [ ] ExecutionController DEFAULT_ADMIN_ROLE granted to Governance Safe.
- [ ] SignalRegistry SIGNALER_ROLE granted to Signaler Safe.
- [ ] ExecutionController EXECUTOR_ROLE granted to Executor Safe.
- [ ] TreasuryVault EXECUTOR_ROLE granted only to ExecutionController.
- [ ] Deployer roles revoked.
- [ ] No direct EOA vault executor remains.
- [ ] Role state independently verified.

## Mainnet rule

Deployment is incomplete until every privileged role is transferred or intentionally documented.
