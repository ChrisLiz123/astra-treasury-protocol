// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AstraTreasury Signal Registry
/// @notice Stores model-generated signal metadata for auditability.
/// @dev Signals are not orders. They are inputs to a separate approval/execution process.
contract SignalRegistry is AccessControl, Pausable {
    bytes32 public constant SIGNALER_ROLE = keccak256("SIGNALER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct Signal {
        bytes32 signalId;
        string modelVersion;
        uint8 actionType;
        uint16 confidenceBps;
        uint16 riskBps;
        uint256 maxSizeUsd;
        bytes32 dataHash;
        string reasonCode;
        uint64 createdAt;
        address submittedBy;
        bool cancelled;
    }

    mapping(bytes32 signalId => Signal signal) public signals;
    mapping(bytes32 signalId => bool exists) public signalExists;

    event SignalSubmitted(
        bytes32 indexed signalId,
        string modelVersion,
        uint8 actionType,
        uint16 confidenceBps,
        uint16 riskBps,
        uint256 maxSizeUsd,
        bytes32 dataHash,
        string reasonCode,
        address indexed submittedBy
    );
    event SignalCancelled(bytes32 indexed signalId, address indexed cancelledBy);

    error ZeroAdmin();
    error EmptySignalId();
    error DuplicateSignal(bytes32 signalId);
    error UnknownSignal(bytes32 signalId);
    error InvalidBps(string fieldName);
    error EmptyModelVersion();
    error EmptyDataHash();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAdmin();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SIGNALER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function submitSignal(
        bytes32 signalId,
        string calldata modelVersion,
        uint8 actionType,
        uint16 confidenceBps,
        uint16 riskBps,
        uint256 maxSizeUsd,
        bytes32 dataHash,
        string calldata reasonCode
    ) external whenNotPaused onlyRole(SIGNALER_ROLE) {
        if (signalId == bytes32(0)) revert EmptySignalId();
        if (signalExists[signalId]) revert DuplicateSignal(signalId);
        if (bytes(modelVersion).length == 0) revert EmptyModelVersion();
        if (dataHash == bytes32(0)) revert EmptyDataHash();
        if (confidenceBps > 10_000) revert InvalidBps("confidenceBps");
        if (riskBps > 10_000) revert InvalidBps("riskBps");

        signals[signalId] = Signal({
            signalId: signalId,
            modelVersion: modelVersion,
            actionType: actionType,
            confidenceBps: confidenceBps,
            riskBps: riskBps,
            maxSizeUsd: maxSizeUsd,
            dataHash: dataHash,
            reasonCode: reasonCode,
            createdAt: uint64(block.timestamp),
            submittedBy: msg.sender,
            cancelled: false
        });
        signalExists[signalId] = true;

        emit SignalSubmitted(
            signalId,
            modelVersion,
            actionType,
            confidenceBps,
            riskBps,
            maxSizeUsd,
            dataHash,
            reasonCode,
            msg.sender
        );
    }

    function cancelSignal(bytes32 signalId) external whenNotPaused onlyRole(SIGNALER_ROLE) {
        if (!signalExists[signalId]) revert UnknownSignal(signalId);
        signals[signalId].cancelled = true;
        emit SignalCancelled(signalId, msg.sender);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
