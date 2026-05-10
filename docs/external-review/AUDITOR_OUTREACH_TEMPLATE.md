# Auditor Outreach Template

Subject: Smart contract audit inquiry for AstraTreasury Protocol v0.1.1

Hello,

We are preparing AstraTreasury Protocol v0.1.1 for external review.

AstraTreasury is a Base Sepolia testnet prototype for AI-assisted treasury governance. It uses a human-in-the-loop design with paper signals, manual signal approval, on-chain signal logging, policy-aware execution proposals, and separate human approval before any treasury movement.

Current status:

- Base Sepolia testnet only
- No mainnet deployment
- No real treasury funds
- No public token sale
- CI passing
- Live invariant checks passing
- Local stateful and randomized fuzz checks passing

We would like an audit of the Solidity contracts and the treasury execution workflow.

Primary scope:

- AstraToken.sol
- TreasuryPolicy.sol
- TreasuryVault.sol
- SignalRegistry.sol
- ExecutionController.sol

We can provide:

- GitHub repository
- Audit candidate package
- Deployment manifest
- Existing invariant and fuzz reports
- Known issue history and patch notes

Requested deliverables:

- Findings report
- Severity ratings
- Reproduction steps
- Remediation recommendations
- Post-remediation review
- Mainnet readiness comments

Please let us know your availability, estimated timeline, pricing model, and any preferred intake format.

Thank you.
