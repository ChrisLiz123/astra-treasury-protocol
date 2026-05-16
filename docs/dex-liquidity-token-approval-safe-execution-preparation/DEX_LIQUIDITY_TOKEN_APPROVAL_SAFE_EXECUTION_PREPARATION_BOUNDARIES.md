# DEX Liquidity Token Approval Safe Execution Preparation Boundaries

## This package can do

- Prepare the Safe execution instruction.
- Re-check Safe Transaction Service.
- Re-check allowances and balances.
- Confirm token approvals have not executed.
- Publish preparation evidence.

## This package cannot do

- Execute the Safe transaction.
- Execute token approvals.
- Generate liquidity calldata.
- Add liquidity.
- Mint a position.
- Enable public trading.
- Activate the buy page.

## Rule

Preparation only.
