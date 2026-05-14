# DEX Factory/Router Review Boundaries

## This review can do

- Review the intended Uniswap v3 periphery target.
- Review the factory mapping.
- Review the selected pool existence by read-only factory call.
- Confirm whether SwapRouter is needed for pool creation only.
- Confirm whether ERC20 token approvals are needed for pool creation only.

## This review cannot do

- Generate calldata.
- Generate a Safe payload.
- Prepare a Safe transaction.
- Execute a Safe transaction.
- Create a pool.
- Initialize a pool.
- Add liquidity.
- Move funds.
- Enable public trading.
- Activate a buy page.

## Rule

Review-only.
