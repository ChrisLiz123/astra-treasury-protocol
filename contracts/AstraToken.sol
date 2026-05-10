// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title AstraTreasury Token (ASTP)
/// @notice Fixed-supply ERC-20 for the AstraTreasury Protocol MVP.
/// @dev There is no owner and no mint function after deployment.
contract AstraToken is ERC20 {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;

    uint256 public constant TREASURY_ALLOCATION = 350_000_000 * 1e18;
    uint256 public constant ECOSYSTEM_ALLOCATION = 200_000_000 * 1e18;
    uint256 public constant LIQUIDITY_ALLOCATION = 150_000_000 * 1e18;
    uint256 public constant TEAM_ALLOCATION = 150_000_000 * 1e18;
    uint256 public constant COMMUNITY_ALLOCATION = 100_000_000 * 1e18;
    uint256 public constant ADVISORS_ALLOCATION = 50_000_000 * 1e18;

    error ZeroAddress(string allocationName);

    constructor(
        address treasuryVault,
        address ecosystemWallet,
        address liquidityWallet,
        address teamWallet,
        address communityRewardsWallet,
        address advisorsWallet
    ) ERC20("AstraTreasury Token", "ASTP") {
        _requireNonZero(treasuryVault, "treasuryVault");
        _requireNonZero(ecosystemWallet, "ecosystemWallet");
        _requireNonZero(liquidityWallet, "liquidityWallet");
        _requireNonZero(teamWallet, "teamWallet");
        _requireNonZero(communityRewardsWallet, "communityRewardsWallet");
        _requireNonZero(advisorsWallet, "advisorsWallet");

        _mint(treasuryVault, TREASURY_ALLOCATION);
        _mint(ecosystemWallet, ECOSYSTEM_ALLOCATION);
        _mint(liquidityWallet, LIQUIDITY_ALLOCATION);
        _mint(teamWallet, TEAM_ALLOCATION);
        _mint(communityRewardsWallet, COMMUNITY_ALLOCATION);
        _mint(advisorsWallet, ADVISORS_ALLOCATION);

        assert(totalSupply() == TOTAL_SUPPLY);
    }

    function _requireNonZero(address account, string memory allocationName) private pure {
        if (account == address(0)) revert ZeroAddress(allocationName);
    }
}
