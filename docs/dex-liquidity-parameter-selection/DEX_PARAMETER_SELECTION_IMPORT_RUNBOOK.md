# DEX Parameter Selection Import Runbook

## Step 1

Confirm DEX Liquidity Parameter Review gate passes.

## Step 2

Confirm the exact pair, pool version, and fee/pool type have been selected for review.

## Step 3

Confirm no immediate Safe payload, pool creation, liquidity provisioning, or public trading is requested.

## Step 4

Import the selection with the guarded importer.

## Step 5

Run the selection import gate.

## Step 6

Proceed to a separate parameter finalization review.

## Rule

Do not create a pool or add liquidity from this import.
