# DEX Liquidity Provision Approval Boundaries

## This package can do

- Confirm the pool exists and has zero liquidity.
- Confirm the post-execution verification is complete.
- Record approval to proceed into later liquidity-provision planning.

## This package cannot do

- Generate liquidity calldata.
- Generate a Safe payload.
- Submit a Safe transaction.
- Execute a Safe transaction.
- Approve token transfers.
- Add liquidity.
- Mint a liquidity position.
- Move treasury funds.
- Enable public trading.
- Activate the buy page.

## Rule

Approval-only.
