# AstraTreasury Protocol

AstraTreasury Protocol is a Base Sepolia testnet MVP for an AI-assisted treasury workflow.

## Current status

This deployment is a testnet prototype. It is not a public token sale, not an investment product, and not a promise of returns.

## Core safety model

```text
AI paper signal
→ local paper-trading dashboard
→ manual signal approval queue
→ SignalRegistry on Base Sepolia
→ policy-aware execution queue
→ manual execution approval
→ ExecutionController
→ TreasuryVault
```

The dashboard and APIs are read-only. Private keys are not used by the dashboard.

## Public documents

- [Contracts](./contracts.md)
- [Safety workflow](./safety-workflow.md)
- [Dashboard/API](./dashboard-api.md)
- [Verification](./verification.md)
- [Status snapshot](./status-snapshot.json)
