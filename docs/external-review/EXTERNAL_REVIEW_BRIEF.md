# AstraTreasury External Review Brief

## Project

AstraTreasury Protocol v0.1.1

## Current status

Network: Base Sepolia
Mainnet launched: no
Real treasury funds: no
Public token sale: no
Investment product: no
Audit candidate: yes

## Purpose

AstraTreasury is a testnet prototype for AI-assisted treasury governance.

The system uses paper-trading signals, human signal approval, on-chain signal logging, policy-aware execution proposals, and separate human approval before any treasury movement.

## Core workflow

AI paper signal -> signal approval queue -> SignalRegistry -> execution proposal queue -> TreasuryPolicy check -> manual execution approval -> ExecutionController -> TreasuryVault

## Current public site

https://astratreasury.ai
https://www.astratreasury.ai

## Public repo status

CI passing.
Release safety check passing.
Live invariant checks passing.
Local stateful checks passing.
Local randomized stateful fuzz checks passing.

## Known fixed issue

The v0.1.0 ExecutionController allowed execution of cancelled SignalRegistry signals.

v0.1.1 patched ExecutionController to reject cancelled signals before treasury execution.

## Mainnet status

AstraTreasury is not ready for mainnet until external audit, legal review, multisig setup, and production runbooks are complete.
