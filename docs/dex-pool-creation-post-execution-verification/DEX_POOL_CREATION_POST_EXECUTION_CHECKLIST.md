# DEX Pool Creation Post-Execution Verification Checklist

## Required checks

- [x] Safe execution live evidence recorded.
- [x] Pool-created evidence recorded.
- [x] Factory getPool returns non-zero pool.
- [x] Factory getPool address matches recorded pool address.
- [x] Pool contract code exists.
- [x] token0 matches reviewed token0.
- [x] token1 matches reviewed token1.
- [x] fee matches reviewed fee tier.
- [x] slot0 is initialized.
- [x] liquidity is zero.
- [x] Liquidity not added.
- [x] Funds not moved.
- [x] Public trading not approved.
- [x] Buy page not activated.
- [x] Full launch not approved.

## Required before liquidity provision

- [ ] Liquidity provision approval recorded.
- [ ] Treasury funding approval recorded.
- [ ] Public status update prepared.
- [ ] Operator liquidity transaction path reviewed.

## Rule

Pool verification does not authorize liquidity.
