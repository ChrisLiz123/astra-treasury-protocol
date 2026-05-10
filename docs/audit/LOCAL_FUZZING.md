# Local Stateful Fuzzing

AstraTreasury includes a local randomized stateful audit harness.

## Commands

npm run audit:local-fuzz
npm run audit:local-fuzz:deep

## What it tests

The harness deploys fresh local contracts and randomly exercises sequences of:

- submit signal
- cancel signal
- execute valid proposal
- attempt duplicate execution
- attempt unknown-signal execution
- attempt cancelled-signal execution
- attempt high-slippage execution
- attempt unapproved-asset execution
- attempt zero-recipient execution

## Invariants

The harness checks:

- total supply never changes
- vault balance never exceeds initial treasury allocation
- valid executions move exactly the proposal amount
- duplicate executions revert
- unknown signals revert
- cancelled signals revert
- high slippage reverts
- unapproved assets revert
- zero recipient reverts
- executed actions are marked executed

## Output

reports/audit/local-stateful-fuzz.json

## Purpose

This is not a substitute for an external audit, but it provides repeatable local stateful coverage before external review and mainnet planning.
