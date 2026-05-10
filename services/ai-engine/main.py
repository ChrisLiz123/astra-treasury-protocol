#!/usr/bin/env python3
"""AstraTreasury Protocol v0.1 AI signal simulator.

This is intentionally simple. It is a paper-trading/simulation utility, not a
live trading bot. It produces signal-shaped JSON that can later be signed,
reviewed, and submitted to SignalRegistry after audit/legal review.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import asdict, dataclass
from enum import IntEnum
from typing import Any


class ActionType(IntEnum):
    HOLD = 0
    ADD_LIQUIDITY = 1
    REMOVE_LIQUIDITY = 2
    BUYBACK_SMALL = 3
    REBALANCE_TO_STABLES = 4
    REBALANCE_TO_ETH = 5
    GRANT = 6
    PAUSE_RISKY_ACTIONS = 7


@dataclass(frozen=True)
class MarketSnapshot:
    token_price_usd: float
    liquidity_depth_usd: float
    spread_bps: float
    volatility_24h_bps: float
    stable_reserve_ratio_bps: float
    treasury_value_usd: float
    buy_sell_imbalance_bps: float


@dataclass(frozen=True)
class Signal:
    model_version: str
    action_type: int
    confidence_bps: int
    risk_bps: int
    max_size_usd: int
    data_hash: str
    reason_code: str
    generated_at: int


def hash_snapshot(snapshot: MarketSnapshot) -> str:
    payload = json.dumps(asdict(snapshot), sort_keys=True, separators=(",", ":")).encode()
    return "0x" + hashlib.sha256(payload).hexdigest()


def clamp_bps(value: float) -> int:
    return max(0, min(10_000, int(round(value))))


def generate_signal(snapshot: MarketSnapshot) -> Signal:
    risk = clamp_bps(
        0.45 * snapshot.volatility_24h_bps
        + 0.35 * snapshot.spread_bps
        + 0.20 * max(0, 4_000 - snapshot.stable_reserve_ratio_bps)
    )

    action = ActionType.HOLD
    reason = "DEFAULT_HOLD"
    confidence = 5_500
    max_size = 0

    if risk >= 7_500:
        action = ActionType.PAUSE_RISKY_ACTIONS
        reason = "HIGH_RISK_PAUSE"
        confidence = 7_200
    elif snapshot.stable_reserve_ratio_bps < 4_000:
        action = ActionType.REBALANCE_TO_STABLES
        reason = "STABLE_RESERVE_BELOW_POLICY"
        confidence = 7_000
        max_size = int(min(0.005 * snapshot.treasury_value_usd, 10_000))
    elif snapshot.liquidity_depth_usd < 50_000 and snapshot.spread_bps > 120:
        action = ActionType.ADD_LIQUIDITY
        reason = "LOW_DEPTH_HIGH_SPREAD"
        confidence = 7_400
        max_size = int(min(0.005 * snapshot.treasury_value_usd, 5_000))
    elif snapshot.buy_sell_imbalance_bps < -2_500 and risk < 4_000:
        action = ActionType.BUYBACK_SMALL
        reason = "BUY_PRESSURE_WEAK_RISK_ACCEPTABLE"
        confidence = 6_500
        max_size = int(min(0.0025 * snapshot.treasury_value_usd, 2_500))

    return Signal(
        model_version="astra-risk-v0.1",
        action_type=int(action),
        confidence_bps=confidence,
        risk_bps=risk,
        max_size_usd=max_size,
        data_hash=hash_snapshot(snapshot),
        reason_code=reason,
        generated_at=int(time.time()),
    )


def main() -> None:
    example_snapshot = MarketSnapshot(
        token_price_usd=0.025,
        liquidity_depth_usd=35_000,
        spread_bps=160,
        volatility_24h_bps=2_100,
        stable_reserve_ratio_bps=4_800,
        treasury_value_usd=1_000_000,
        buy_sell_imbalance_bps=-1_200,
    )
    signal = generate_signal(example_snapshot)
    output: dict[str, Any] = {
        "snapshot": asdict(example_snapshot),
        "signal": asdict(signal),
        "note": "Simulation output only. Do not execute automatically."
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
