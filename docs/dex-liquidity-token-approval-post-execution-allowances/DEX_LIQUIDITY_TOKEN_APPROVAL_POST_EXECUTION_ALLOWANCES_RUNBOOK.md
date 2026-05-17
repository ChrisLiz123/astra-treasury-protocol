# DEX Liquidity Token Approval Post-Execution Allowance Verification Runbook

## Step 1

Confirm token approval Safe execution live status passed.

## Step 2

Query current token allowances from the liquidity Safe to the approval spender.

## Step 3

Confirm allowances meet the required amounts.

## Step 4

Confirm balances still cover the planned liquidity amounts.

## Step 5

Confirm no liquidity or public-trading artifacts exist.

## Step 6

Proceed to liquidity mint calldata generation approval.

## Rule

Do not generate liquidity calldata or add liquidity during this milestone.
