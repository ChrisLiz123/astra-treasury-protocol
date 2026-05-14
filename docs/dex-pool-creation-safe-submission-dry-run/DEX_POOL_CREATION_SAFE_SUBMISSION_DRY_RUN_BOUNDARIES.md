# DEX Pool Creation Safe Submission Dry Run Boundaries

## This package can do

- Review the exact fields that a later Safe submission step will use.
- Preserve an operator review checklist.
- Confirm no submission, queue, execution, pool creation, liquidity, or funds movement artifacts exist.

## This package cannot do

- POST to the Safe Transaction Service.
- Use a Safe API key.
- Open or automate the Safe UI.
- Request signatures.
- Queue a Safe transaction.
- Execute a Safe transaction.
- Create a pool.
- Add liquidity.
- Move funds.

## Rule

Dry run is review-only.
