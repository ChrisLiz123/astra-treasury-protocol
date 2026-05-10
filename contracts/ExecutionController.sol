// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITreasuryPolicyValidator {
    function validateAction(
        uint8 actionType,
        address asset,
        uint256 proposedUsdValue,
        uint256 treasuryUsdValue,
        uint256 dailyUsdUsed,
        uint256 stableReserveUsdValue,
        uint16 slippageBps,
        bool usesRealizedRevenue
    ) external view returns (bool allowed, string memory reason);
}

interface ISignalRegistryLookup {
    function signalExists(bytes32 signalId) external view returns (bool);
}

interface ITreasuryVaultExecutor {
    function transferToken(bytes32 actionId, address token, address recipient, uint256 amount) external;
    function transferNative(bytes32 actionId, address payable recipient, uint256 amount) external;
}

/// @title AstraTreasury Execution Controller
/// @notice Gatekeeper between model signals, treasury policy, and vault movements.
/// @dev This MVP supports policy-checked transfers only. DEX execution should be added after simulation/audit.
contract ExecutionController is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");

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

    struct ActionProposal {
        bytes32 actionId;
        bytes32 signalId;
        ActionType actionType;
        address asset;
        address recipient;
        uint256 amount;
        uint256 proposedUsdValue;
        uint256 treasuryUsdValue;
        uint256 dailyUsdUsed;
        uint256 stableReserveUsdValue;
        uint16 slippageBps;
        bool usesRealizedRevenue;
        string memo;
    }

    address public vault;
    address public policy;
    address public signalRegistry;

    mapping(bytes32 actionId => bool executed) public actionExecuted;

    event DependenciesUpdated(address indexed vault, address indexed policy, address indexed signalRegistry);
    event ActionExecuted(
        bytes32 indexed actionId,
        bytes32 indexed signalId,
        ActionType actionType,
        address indexed asset,
        address recipient,
        uint256 amount,
        string memo,
        address executor
    );

    error ZeroAdmin();
    error ZeroDependency(string dependencyName);
    error EmptyActionId();
    error DuplicateAction(bytes32 actionId);
    error UnknownSignal(bytes32 signalId);
    error ZeroRecipient();
    error PolicyRejected(string reason);

    constructor(address admin, address initialVault, address initialPolicy, address initialSignalRegistry) {
        if (admin == address(0)) revert ZeroAdmin();
        _setDependencies(initialVault, initialPolicy, initialSignalRegistry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(CONFIG_ROLE, admin);
    }

    function setDependencies(address newVault, address newPolicy, address newSignalRegistry) external onlyRole(CONFIG_ROLE) {
        _setDependencies(newVault, newPolicy, newSignalRegistry);
    }

    function executeTokenTransfer(ActionProposal calldata proposal)
        external
        onlyRole(EXECUTOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        _validateProposal(proposal);
        _validatePolicy(proposal);

        actionExecuted[proposal.actionId] = true;
        ITreasuryVaultExecutor(vault).transferToken(
            proposal.actionId,
            proposal.asset,
            proposal.recipient,
            proposal.amount
        );

        emit ActionExecuted(
            proposal.actionId,
            proposal.signalId,
            proposal.actionType,
            proposal.asset,
            proposal.recipient,
            proposal.amount,
            proposal.memo,
            msg.sender
        );
    }

    function executeNativeTransfer(ActionProposal calldata proposal)
        external
        onlyRole(EXECUTOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        _validateProposal(proposal);
        _validatePolicy(proposal);

        actionExecuted[proposal.actionId] = true;
        ITreasuryVaultExecutor(vault).transferNative(
            proposal.actionId,
            payable(proposal.recipient),
            proposal.amount
        );

        emit ActionExecuted(
            proposal.actionId,
            proposal.signalId,
            proposal.actionType,
            address(0),
            proposal.recipient,
            proposal.amount,
            proposal.memo,
            msg.sender
        );
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _validateProposal(ActionProposal calldata proposal) private view {
        if (proposal.actionId == bytes32(0)) revert EmptyActionId();
        if (actionExecuted[proposal.actionId]) revert DuplicateAction(proposal.actionId);
        if (proposal.recipient == address(0)) revert ZeroRecipient();
        if (proposal.signalId != bytes32(0) && !ISignalRegistryLookup(signalRegistry).signalExists(proposal.signalId)) {
            revert UnknownSignal(proposal.signalId);
        }
    }

    function _validatePolicy(ActionProposal calldata proposal) private view {
        (bool allowed, string memory reason) = ITreasuryPolicyValidator(policy).validateAction(
            uint8(proposal.actionType),
            proposal.asset,
            proposal.proposedUsdValue,
            proposal.treasuryUsdValue,
            proposal.dailyUsdUsed,
            proposal.stableReserveUsdValue,
            proposal.slippageBps,
            proposal.usesRealizedRevenue
        );
        if (!allowed) revert PolicyRejected(reason);
    }

    function _setDependencies(address newVault, address newPolicy, address newSignalRegistry) private {
        if (newVault == address(0)) revert ZeroDependency("vault");
        if (newPolicy == address(0)) revert ZeroDependency("policy");
        if (newSignalRegistry == address(0)) revert ZeroDependency("signalRegistry");
        vault = newVault;
        policy = newPolicy;
        signalRegistry = newSignalRegistry;
        emit DependenciesUpdated(newVault, newPolicy, newSignalRegistry);
    }
}
