// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice A transferable class license. Gameplay access follows current NFT ownership.
contract AssetTycoonLicense is ERC721Enumerable, AccessControl, EIP712 {
    bytes32 private constant MINT_CLAIM_TYPEHASH = keccak256(
        "MintClaim(bytes32 claimId,bytes32 attemptId,address player,uint256 nonce,uint64 deadline)"
    );

    struct MintClaim {
        bytes32 claimId;
        bytes32 attemptId;
        address player;
        uint256 nonce;
        uint64 deadline;
    }

    address public rewardSigner;
    uint256 public nextTokenId = 1;
    mapping(address player => uint256 nonce) public nonces;
    mapping(bytes32 claimId => bool used) public usedClaims;
    mapping(bytes32 attemptId => bool minted) public rewardedAttempts;

    error ClaimAlreadyUsed(); error AttemptAlreadyRewarded(); error ClaimExpired();
    error InvalidNonce(); error InvalidPlayer(); error UnauthorizedSigner(); error ZeroAddress();
    event AssetTycoonMinted(uint256 indexed tokenId, bytes32 indexed attemptId, address indexed player);

    constructor(address admin, address signer)
        ERC721("Avalanche Quest Asset Tycoon", "AQTYCOON")
        EIP712("Avalanche Quest Asset Tycoon", "1")
    {
        if (admin == address(0) || signer == address(0)) revert ZeroAddress();
        rewardSigner = signer;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setRewardSigner(address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (signer == address(0)) revert ZeroAddress();
        rewardSigner = signer;
    }

    function mint(MintClaim calldata claim, bytes calldata signature) external returns (uint256 tokenId) {
        if (claim.player != msg.sender) revert InvalidPlayer();
        if (block.timestamp > claim.deadline) revert ClaimExpired();
        if (claim.nonce != nonces[msg.sender]) revert InvalidNonce();
        if (usedClaims[claim.claimId]) revert ClaimAlreadyUsed();
        if (rewardedAttempts[claim.attemptId]) revert AttemptAlreadyRewarded();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(MINT_CLAIM_TYPEHASH, claim)));
        if (ECDSA.recover(digest, signature) != rewardSigner) revert UnauthorizedSigner();

        usedClaims[claim.claimId] = true;
        rewardedAttempts[claim.attemptId] = true;
        nonces[msg.sender]++;
        tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        emit AssetTycoonMinted(tokenId, claim.attemptId, msg.sender);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "ipfs://bafybeigavalanchequestassettycoon/metadata.json";
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
