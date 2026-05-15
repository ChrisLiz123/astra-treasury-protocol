# DEX Liquidity Mint Parameter Review Runbook

## Step 1

Confirm token approval requirements review is complete.

## Step 2

Provide reviewed raw mint amounts and tick range.

## Step 3

Run the mint parameter review gate.

## Step 4

Confirm no calldata, Safe payload, liquidity addition, or position mint exists.

## Step 5

Proceed to treasury funding / token approval payload generation approval only after review.

## Rule

Do not generate liquidity calldata during this review.
