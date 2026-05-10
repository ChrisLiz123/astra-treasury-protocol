// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITreasuryPolicyAssetCheck {
    function isApprovedAsset(address asset) external view returns (bool);
}

/// @title AstraTreasury Vault
/// @notice Custody layer for protocol assets. Only authorized execution controllers can move funds.
contract TreasuryVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant POLICY_SETTER_ROLE = keccak256("POLICY_SETTER_ROLE");

    address public policy;

    event PolicyUpdated(address indexed oldPolicy, address indexed newPolicy);
    event NativeReceived(address indexed sender, uint256 amount);
    event NativeTransferred(bytes32 indexed actionId, address indexed recipient, uint256 amount, address indexed executor);
    event TokenTransferred(bytes32 indexed actionId, address indexed token, address indexed recipient, uint256 amount, address executor);
    event TokenApprovalUpdated(bytes32 indexed actionId, address indexed token, address indexed spender, uint256 amount, address executor);

    error ZeroAdmin();
    error ZeroPolicy();
    error ZeroRecipient();
    error EmptyActionId();
    error AssetNotApproved(address asset);
    error NativeTransferFailed();

    constructor(address admin, address initialPolicy) {
        if (admin == address(0)) revert ZeroAdmin();
        if (initialPolicy == address(0)) revert ZeroPolicy();

        policy = initialPolicy;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(POLICY_SETTER_ROLE, admin);
    }

    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    function setPolicy(address newPolicy) external onlyRole(POLICY_SETTER_ROLE) {
        if (newPolicy == address(0)) revert ZeroPolicy();
        address oldPolicy = policy;
        policy = newPolicy;
        emit PolicyUpdated(oldPolicy, newPolicy);
    }

    function transferToken(
        bytes32 actionId,
        address token,
        address recipient,
        uint256 amount
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant {
        _requireActionId(actionId);
        _requireRecipient(recipient);
        _requireApprovedAsset(token);
        IERC20(token).safeTransfer(recipient, amount);
        emit TokenTransferred(actionId, token, recipient, amount, msg.sender);
    }

    function transferNative(
        bytes32 actionId,
        address payable recipient,
        uint256 amount
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant {
        _requireActionId(actionId);
        _requireRecipient(recipient);
        _requireApprovedAsset(address(0));
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert NativeTransferFailed();
        emit NativeTransferred(actionId, recipient, amount, msg.sender);
    }

    function approveTokenSpender(
        bytes32 actionId,
        address token,
        address spender,
        uint256 amount
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant {
        _requireActionId(actionId);
        _requireRecipient(spender);
        _requireApprovedAsset(token);
        IERC20(token).forceApprove(spender, amount);
        emit TokenApprovalUpdated(actionId, token, spender, amount, msg.sender);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _requireApprovedAsset(address asset) private view {
        if (!ITreasuryPolicyAssetCheck(policy).isApprovedAsset(asset)) {
            revert AssetNotApproved(asset);
        }
    }

    function _requireActionId(bytes32 actionId) private pure {
        if (actionId == bytes32(0)) revert EmptyActionId();
    }

    function _requireRecipient(address recipient) private pure {
        if (recipient == address(0)) revert ZeroRecipient();
    }
}
