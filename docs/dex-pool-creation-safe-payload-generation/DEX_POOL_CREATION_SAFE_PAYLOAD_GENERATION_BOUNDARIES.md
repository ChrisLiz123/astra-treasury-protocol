# DEX Pool Creation Safe Payload Generation Boundaries

## This package can do

- Generate encoded calldata.
- Generate a local Safe payload file for review.
- Record the generated payload hash.
- Preserve public evidence.

## This package cannot do

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

The generated payload must remain local and unsubmitted.
