# DEX Liquidity Funding Transfer Payload Generation Approval Boundaries

## This package can do

- Record approval for a later funding-transfer payload-generation step.
- Carry forward the approved shortfalls.
- Confirm source and destination addresses.
- Confirm no funding payload or transfer has occurred.

## This package cannot do

- Generate transfer calldata.
- Generate Safe payloads.
- Submit a Safe transaction.
- Execute a transfer.
- Move treasury funds.
- Execute token approvals.
- Add liquidity.
- Mint a position.
- Enable public trading.
- Activate the buy page.

## Rule

Approval-only.
