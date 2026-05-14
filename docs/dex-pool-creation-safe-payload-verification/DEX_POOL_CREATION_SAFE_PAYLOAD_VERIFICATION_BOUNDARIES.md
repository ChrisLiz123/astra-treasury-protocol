# DEX Pool Creation Safe Payload Verification Boundaries

## This review can do

- Verify the generated local payload.
- Decode calldata.
- Compare payload inputs with reviewed evidence.
- Record verification evidence.

## This review cannot do

- Submit a transaction to Safe.
- Queue a transaction in Safe.
- Execute a Safe transaction.
- Create a pool.
- Add liquidity.
- Move funds.
- Enable public trading.
- Activate a buy page.
- Approve full launch.

## Rule

Verification is review-only.
