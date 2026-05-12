# Mainnet Post-Deployment Verification v1

## Status

Status: PASS

## Network

Base Mainnet

Chain ID: 8453

## Verification summary

Checks passed: 31/31
Warnings: 0

## Verified properties

- Contract bytecode exists at deployed addresses.
- ASTP token metadata and supply are correct.
- TreasuryVault ASTP balance is correct.
- Contract wiring is correct.
- TreasuryPolicy approves ASTP.
- Governance Safe owns admin roles.
- ExecutionController has TreasuryVault executor role.
- Signaler Safe has SignalRegistry signaler role.
- Executor Safe has ExecutionController executor role.
- Deployer does not retain long-term privileged roles.

## Important

This verification does not approve real treasury funding, public token sale, staking, buybacks, or autonomous execution.
