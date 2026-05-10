# Constructor Argument Manifest

## Purpose

This document records the constructor arguments required for a future mainnet deployment.

## Contracts

### TreasuryPolicy

Constructor:
admin

Expected mainnet value:
Governance Safe

### TreasuryVault

Constructor:
admin, policy

Expected mainnet values:
Governance Safe, TreasuryPolicy

### SignalRegistry

Constructor:
admin

Expected mainnet value:
Governance Safe

### ExecutionController

Constructor:
admin, vault, policy, signalRegistry

Expected mainnet values:
Governance Safe, TreasuryVault, TreasuryPolicy, SignalRegistry

### AstraToken

Constructor:
treasuryVault, ecosystemWallet, liquidityWallet, teamWallet, communityWallet, advisorsWallet

Expected mainnet values:
TreasuryVault and approved allocation wallets or Safes

## Rule

Constructor arguments must be reviewed before deployment and must match the final Safe role plan.
