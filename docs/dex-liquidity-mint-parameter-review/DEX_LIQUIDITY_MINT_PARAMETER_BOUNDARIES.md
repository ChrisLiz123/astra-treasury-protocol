# DEX Liquidity Mint Parameter Review Boundaries

## This package can do

- Review mint parameters.
- Read pool tick spacing and current tick.
- Read current Safe token balances and allowances.
- Record whether the proposed mint parameters are structurally valid.

## This package cannot do

- Generate mint calldata.
- Generate Safe payloads.
- Execute token approvals.
- Add liquidity.
- Mint a position.
- Move treasury funds.
- Enable public trading.
- Activate the buy page.
- Approve full launch.

## Rule

Read-only review.
