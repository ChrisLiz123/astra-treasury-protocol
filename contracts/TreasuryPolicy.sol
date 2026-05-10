// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AstraTreasury Policy
/// @notice Rulebook for treasury actions. The MVP uses externally supplied USD/risk values.
/// @dev This contract does not price assets on-chain. In production, pair it with verified oracles and audited execution paths.
contract TreasuryPolicy is AccessControl {
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");
    uint16 public constant BPS_DENOMINATOR = 10_000;

    enum ActionType {
        HOLD,
        ADD_LIQUIDITY,
        REMOVE_LIQUIDITY,
        BUYBACK_SMALL,
        REBALANCE_TO_STABLES,
        REBALANCE_TO_ETH,
        GRANT,
        PAUSE_RISKY_ACTIONS
    }

    struct PolicyConfig {
        uint16 maxSingleTradeBps;            // Example: 50 = 0.50% of treasury value
        uint16 maxDailyTradeBps;             // Example: 200 = 2.00% of treasury value
        uint16 minStableReserveBps;          // Example: 4000 = 40.00% of treasury value
        uint16 maxMonthlyBuybackRevenueBps;  // Example: 2000 = 20.00% of realized protocol revenue
        uint16 maxSlippageBps;               // Example: 100 = 1.00%
        bool allowBuybacks;
        bool allowLiquidityActions;
        bool allowGrants;
    }

    PolicyConfig public config;
    mapping(address asset => bool approved) public approvedAssets;
    mapping(address asset => bool stableAsset) public stableAssets;

    event PolicyConfigUpdated(PolicyConfig config);
    event AssetPolicyUpdated(address indexed asset, bool approved, bool stableAsset);

    error InvalidBps(string fieldName);
    error ZeroAdmin();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAdmin();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ADMIN_ROLE, admin);

        config = PolicyConfig({
            maxSingleTradeBps: 50,
            maxDailyTradeBps: 200,
            minStableReserveBps: 4_000,
            maxMonthlyBuybackRevenueBps: 2_000,
            maxSlippageBps: 100,
            allowBuybacks: true,
            allowLiquidityActions: true,
            allowGrants: true
        });

        // Native ETH. It is not considered a stable asset.
        approvedAssets[address(0)] = true;
        emit AssetPolicyUpdated(address(0), true, false);
    }

    function setConfig(PolicyConfig calldata newConfig) external onlyRole(POLICY_ADMIN_ROLE) {
        _validateBps(newConfig.maxSingleTradeBps, "maxSingleTradeBps");
        _validateBps(newConfig.maxDailyTradeBps, "maxDailyTradeBps");
        _validateBps(newConfig.minStableReserveBps, "minStableReserveBps");
        _validateBps(newConfig.maxMonthlyBuybackRevenueBps, "maxMonthlyBuybackRevenueBps");
        _validateBps(newConfig.maxSlippageBps, "maxSlippageBps");

        config = newConfig;
        emit PolicyConfigUpdated(newConfig);
    }

    function setAssetPolicy(address asset, bool approved, bool stableAsset) external onlyRole(POLICY_ADMIN_ROLE) {
        approvedAssets[asset] = approved;
        stableAssets[asset] = stableAsset;
        emit AssetPolicyUpdated(asset, approved, stableAsset);
    }

    function isApprovedAsset(address asset) external view returns (bool) {
        return approvedAssets[asset];
    }

    /// @notice Validates a proposed treasury action using externally supplied risk/accounting values.
    /// @param actionType Treasury action type code.
    /// @param asset Asset being moved. Use address(0) for native ETH.
    /// @param proposedUsdValue USD value of the proposed action in 18-decimal fixed-point units.
    /// @param treasuryUsdValue Estimated total treasury USD value in 18-decimal fixed-point units.
    /// @param dailyUsdUsed Estimated daily treasury action value already used in 18-decimal fixed-point units.
    /// @param stableReserveUsdValue Estimated stable reserve value after action in 18-decimal fixed-point units.
    /// @param slippageBps Estimated action slippage in basis points.
    /// @param usesRealizedRevenue True only when a buyback is funded by realized protocol revenue.
    function validateAction(
        uint8 actionType,
        address asset,
        uint256 proposedUsdValue,
        uint256 treasuryUsdValue,
        uint256 dailyUsdUsed,
        uint256 stableReserveUsdValue,
        uint16 slippageBps,
        bool usesRealizedRevenue
    ) external view returns (bool allowed, string memory reason) {
        if (!approvedAssets[asset]) return (false, "ASSET_NOT_APPROVED");
        if (actionType > uint8(ActionType.PAUSE_RISKY_ACTIONS)) return (false, "UNKNOWN_ACTION");
        if (slippageBps > config.maxSlippageBps) return (false, "SLIPPAGE_TOO_HIGH");

        ActionType action = ActionType(actionType);

        if (action == ActionType.HOLD || action == ActionType.PAUSE_RISKY_ACTIONS) {
            return (true, "OK");
        }

        if (treasuryUsdValue == 0) return (false, "TREASURY_VALUE_REQUIRED");

        if (proposedUsdValue * BPS_DENOMINATOR > treasuryUsdValue * config.maxSingleTradeBps) {
            return (false, "SINGLE_ACTION_LIMIT");
        }

        if ((dailyUsdUsed + proposedUsdValue) * BPS_DENOMINATOR > treasuryUsdValue * config.maxDailyTradeBps) {
            return (false, "DAILY_ACTION_LIMIT");
        }

        if (stableReserveUsdValue * BPS_DENOMINATOR < treasuryUsdValue * config.minStableReserveBps) {
            return (false, "STABLE_RESERVE_TOO_LOW");
        }

        if (
            action == ActionType.ADD_LIQUIDITY ||
            action == ActionType.REMOVE_LIQUIDITY
        ) {
            if (!config.allowLiquidityActions) return (false, "LIQUIDITY_ACTIONS_DISABLED");
        }

        if (action == ActionType.BUYBACK_SMALL) {
            if (!config.allowBuybacks) return (false, "BUYBACKS_DISABLED");
            if (!usesRealizedRevenue) return (false, "BUYBACK_REQUIRES_REALIZED_REVENUE");
        }

        if (action == ActionType.GRANT) {
            if (!config.allowGrants) return (false, "GRANTS_DISABLED");
        }

        return (true, "OK");
    }

    function _validateBps(uint16 value, string memory fieldName) private pure {
        if (value > BPS_DENOMINATOR) revert InvalidBps(fieldName);
    }
}
