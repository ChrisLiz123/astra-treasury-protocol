# DEX Pool Creation Safe Submission Preparation Boundaries

## This package can do

- Prepare the local payload for a later approved submission action.
- Preserve the to/value/data/operation fields for operator review.
- Confirm no Safe submission or execution artifact exists.
- Confirm no pool-creation artifact exists.

## This package cannot do

- POST to the Safe Transaction Service.
- Submit through the Safe web app.
- Request signatures.
- Queue a Safe transaction.
- Execute a Safe transaction.
- Create a pool.
- Add liquidity.
- Move funds.

## Rule

Submission preparation is review-only.
