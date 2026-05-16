# DEX Liquidity Token Approval Safe Payload Verification Boundaries

## This package can do

- Verify generated approval calldata.
- Verify payload and Transaction Builder hashes.
- Verify no token approvals have executed.
- Publish verification evidence.

## This package cannot do

- Submit the Safe transaction.
- Execute token approvals.
- Generate liquidity calldata.
- Add liquidity.
- Mint a position.
- Enable public trading.
- Activate the buy page.

## Rule

Verification only.
