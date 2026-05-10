# No-Real-Funds Mainnet Rehearsal Runbook

## Purpose

Prepare a mainnet deployment process without launching a real treasury or public token sale.

## Rehearsal constraints

- No public sale
- No investor marketing
- No treasury funding beyond tiny gas/testing amounts
- No public buyback commitments
- No automated treasury execution
- No user deposits

## Rehearsal phases

### Phase 1: Documentation freeze

- Audit scope finalized
- Legal review package finalized
- Mainnet role map finalized
- Public disclaimers reviewed

### Phase 2: Dry deployment simulation

- Rehearse deployment commands on local network
- Rehearse deployment commands on Base Sepolia
- Verify constructor arguments
- Verify role-transfer procedure
- Verify rollback plan

### Phase 3: Mainnet checklist only

- Confirm dedicated RPC provider
- Confirm Safe addresses
- Confirm signer availability
- Confirm no real treasury funding
- Confirm legal/audit status

### Phase 4: Mainnet deployment decision

Deployment remains blocked unless every go/no-go item is green.

## Output

Each rehearsal should produce a signed or logged checklist and timestamped decision record.
