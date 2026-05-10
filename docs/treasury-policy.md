# Treasury Policy v0.1

The treasury policy contract defines guardrails, but it does not independently price assets. In v0.1, an execution proposal must provide estimated values such as `treasuryUsdValue`, `stableReserveUsdValue`, and `proposedUsdValue`.

## Allowed MVP action types

| Code | Action |
|---:|---|
| 0 | HOLD |
| 1 | ADD_LIQUIDITY |
| 2 | REMOVE_LIQUIDITY |
| 3 | BUYBACK_SMALL |
| 4 | REBALANCE_TO_STABLES |
| 5 | REBALANCE_TO_ETH |
| 6 | GRANT |
| 7 | PAUSE_RISKY_ACTIONS |

## Default limits

| Limit | Default |
|---|---:|
| Max single action | 50 bps |
| Max daily action exposure | 200 bps |
| Minimum stable reserve | 4000 bps |
| Max monthly buyback revenue spend | 2000 bps |
| Max slippage | 100 bps |

## Production upgrade requirements

Before mainnet deployment, the protocol should add:

- Independent oracle/data validation.
- Multisig or timelock governance for policy changes.
- Explicit vesting contracts for team/advisor allocations.
- Independent security audit.
- Public dashboard for model signals and treasury actions.
