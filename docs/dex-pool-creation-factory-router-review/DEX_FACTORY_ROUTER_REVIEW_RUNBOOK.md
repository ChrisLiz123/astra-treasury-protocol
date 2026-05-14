# DEX Factory/Router Review Runbook

## Step 1

Run token ordering and sqrtPriceX96 review.

## Step 2

Run factory/router execution path review.

## Step 3

Confirm NonfungiblePositionManager target and factory mapping.

## Step 4

Confirm no selected pool exists using factory getPool.

## Step 5

Confirm no calldata or Safe payload is generated.

## Step 6

Proceed to Safe owners and threshold review.

## Rule

Do not generate calldata or a Safe payload during this review.
