// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import {GameToken} from "./GameToken.sol";

contract RewardDistributor is AccessControl, EIP712, Pausable, ReentrancyGuard {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant REWARD_SIGNER_ROLE = keccak256("REWARD_SIGNER_ROLE");

    bytes32 public constant REWARD_CLAIM_TYPEHASH = keccak256(
        "RewardClaim(bytes32 claimId,bytes32 attemptId,address player,uint256 tokenAmount,uint256 nonce,uint64 deadline)"
    );

    struct RewardClaim {
        bytes32 claimId;
        bytes32 attemptId;
        address player;
        uint256 tokenAmount;
        uint256 nonce;
        uint64 deadline;
    }

    GameToken public immutable gameToken;
    mapping(bytes32 claimId => bool used) public usedClaims;
    mapping(bytes32 attemptId => bool used) public usedAttempts;
    mapping(address player => uint256 nonce) public nonces;

    error ZeroAddress();
    error InvalidPlayer();
    error InvalidReward();
    error ClaimExpired();
    error ClaimAlreadyUsed();
    error AttemptAlreadyRewarded();
    error InvalidNonce(uint256 expected, uint256 provided);
    error UnauthorizedSigner();

    event RewardClaimed(
        bytes32 indexed claimId,
        bytes32 indexed attemptId,
        address indexed player,
        uint256 tokenAmount,
        uint256 nonce
    );

    constructor(
        address token,
        address admin,
        address pauser,
        address initialRewardSigner
    ) EIP712("Avalanche Quest Rewards", "1") {
        if (
            token == address(0) || admin == address(0) || pauser == address(0)
                || initialRewardSigner == address(0)
        ) revert ZeroAddress();

        gameToken = GameToken(token);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(REWARD_SIGNER_ROLE, initialRewardSigner);
    }

    function claimReward(RewardClaim calldata claim, bytes calldata signature)
        external
        nonReentrant
        whenNotPaused
    {
        if (claim.player == address(0) || msg.sender != claim.player) revert InvalidPlayer();
        if (claim.tokenAmount == 0) revert InvalidReward();
        if (block.timestamp > claim.deadline) revert ClaimExpired();
        if (usedClaims[claim.claimId]) revert ClaimAlreadyUsed();
        if (usedAttempts[claim.attemptId]) revert AttemptAlreadyRewarded();

        uint256 expectedNonce = nonces[claim.player];
        if (claim.nonce != expectedNonce) revert InvalidNonce(expectedNonce, claim.nonce);

        bytes32 structHash = keccak256(
            abi.encode(
                REWARD_CLAIM_TYPEHASH,
                claim.claimId,
                claim.attemptId,
                claim.player,
                claim.tokenAmount,
                claim.nonce,
                claim.deadline
            )
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        if (!hasRole(REWARD_SIGNER_ROLE, signer)) revert UnauthorizedSigner();

        usedClaims[claim.claimId] = true;
        usedAttempts[claim.attemptId] = true;
        nonces[claim.player] = expectedNonce + 1;

        gameToken.mint(claim.player, claim.tokenAmount);
        emit RewardClaimed(
            claim.claimId,
            claim.attemptId,
            claim.player,
            claim.tokenAmount,
            claim.nonce
        );
    }

    function setRewardSigner(address signer, bool allowed)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (signer == address(0)) revert ZeroAddress();
        if (allowed) {
            _grantRole(REWARD_SIGNER_ROLE, signer);
        } else {
            _revokeRole(REWARD_SIGNER_ROLE, signer);
        }
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
