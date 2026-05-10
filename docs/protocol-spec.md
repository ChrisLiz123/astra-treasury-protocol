# AstraTreasury Protocol Specification v0.1

## Purpose

AstraTreasury Protocol is designed as an AI-assisted treasury system, not a self-pumping token. The protocol can log model signals, evaluate actions against transparent policy rules, and execute limited treasury movements through a role-bound vault.

## Token

- Name: AstraTreasury Token
- Symbol: ASTP
- Standard: ERC-20
- Supply: 1,000,000,000 ASTP
- Decimals: 18
- Post-deployment minting: none

## Token allocation

| Allocation | Percent | Tokens |
|---|---:|---:|
| Treasury Vault | 35% | 350,000,000 |
| Ecosystem Grants | 20% | 200,000,000 |
| Initial Liquidity | 15% | 150,000,000 |
| Team | 15% | 150,000,000 |
| Community Rewards | 10% | 100,000,000 |
| Legal / Audits / Advisors | 5% | 50,000,000 |

## MVP treasury rules

- Maximum single action: 0.50% of estimated treasury value.
- Maximum daily action exposure: 2.00% of estimated treasury value.
- Minimum stable reserve: 40.00% of estimated treasury value.
- Maximum slippage: 1.00%.
- Buybacks require realized protocol revenue.
- No leverage or derivatives in v0.1.
- No wash trading.
