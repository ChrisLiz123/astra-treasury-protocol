# Key Management Plan

## Goals

- Separate deployer, governance, treasury, signaler, and executor authority
- Avoid long-lived hot keys for treasury movement
- Ensure emergency access without single-key control
- Document every privileged address before mainnet

## Key classes

### Deployer key

Purpose: deploy contracts only.

Rules:
- Use only for deployment
- Remove privileged roles after deployment
- Do not hold treasury funds
- Store offline after deployment

### Governance Safe owners

Purpose: protocol administration.

Rules:
- At least five independent owners recommended
- Hardware wallet preferred
- No shared seed phrases
- No cloud-stored private keys

### Treasury Safe owners

Purpose: treasury reserve decisions.

Rules:
- Separate from deployer key
- Hardware wallet preferred
- Document signer responsibilities

### Signaler key or Safe

Purpose: submit approved AI signals.

Rules:
- No treasury movement authority
- Can be rotated without moving funds
- Logs every submission

### Executor Safe

Purpose: approve ExecutionController actions.

Rules:
- Must not bypass TreasuryPolicy
- Must not hold DEFAULT_ADMIN_ROLE unless explicitly approved
- Used only after execution queue approval

## Rotation policy

- Rotate any suspected compromised signer immediately
- Review owners monthly
- Review all roles before every release
- Keep an emergency signer replacement runbook
