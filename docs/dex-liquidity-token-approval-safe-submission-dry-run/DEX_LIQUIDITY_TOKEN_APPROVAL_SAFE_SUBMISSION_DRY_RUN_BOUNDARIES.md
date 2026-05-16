# DEX Liquidity Token Approval Safe Submission Dry Run Boundaries

## This package can do

- Re-check prepared submission fields.
- Re-check Transaction Builder JSON.
- Re-check no-submission/no-execution state.
- Publish dry-run evidence.

## This package cannot do

- Submit the Safe transaction.
- Execute token approvals.
- Generate liquidity calldata.
- Add liquidity.
- Mint a position.
- Enable public trading.
- Activate the buy page.

## Rule

Dry-run only.
