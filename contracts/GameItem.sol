// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract GameItem is ERC721Enumerable, ERC721URIStorage, AccessControl, EIP712 {
    uint8 public constant MAX_ITEM_TYPE = 2;
    uint8 public constant MAX_RARITY = 3;
    uint32 public constant MAX_POWER = 10_000;

    bytes32 private constant MINT_CLAIM_TYPEHASH = keccak256(
        "MintClaim(bytes32 claimId,bytes32 attemptId,address player,uint8 itemType,uint8 rarity,uint32 power,bytes32 metadataHash,uint256 nonce,uint64 deadline)"
    );

    struct MintClaim {
        bytes32 claimId;
        bytes32 attemptId;
        address player;
        uint8 itemType;
        uint8 rarity;
        uint32 power;
        bytes32 metadataHash;
        uint256 nonce;
        uint64 deadline;
    }

    address public rewardSigner;
    uint256 public nextTokenId = 1;
    mapping(address player => uint256 nonce) public nonces;
    mapping(bytes32 claimId => bool used) public usedClaims;
    mapping(bytes32 attemptId => bool minted) public rewardedAttempts;
    mapping(uint256 tokenId => uint8 itemType) public itemTypes;
    mapping(uint256 tokenId => uint8 rarity) public rarities;
    mapping(uint256 tokenId => uint32 power) public powers;

    error ClaimAlreadyUsed(); error AttemptAlreadyRewarded(); error ClaimExpired();
    error InvalidNonce(); error InvalidPlayer(); error InvalidMetadata(); error UnauthorizedSigner(); error ZeroAddress();
    error InvalidItemType(); error InvalidRarity(); error InvalidPower();
    event ItemMinted(uint256 indexed tokenId, bytes32 indexed attemptId, address indexed player, uint8 itemType, uint8 rarity, uint32 power);

    constructor(address admin, address signer) ERC721("Avalanche Quest Item", "AQI") EIP712("Avalanche Quest Items", "1") {
        if (admin == address(0) || signer == address(0)) revert ZeroAddress();
        rewardSigner = signer;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setRewardSigner(address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (signer == address(0)) revert ZeroAddress(); rewardSigner = signer;
    }

    function mintItem(MintClaim calldata claim, string calldata metadataURI, bytes calldata signature) external returns (uint256 tokenId) {
        if (claim.player != msg.sender) revert InvalidPlayer();
        if (block.timestamp > claim.deadline) revert ClaimExpired();
        if (claim.nonce != nonces[msg.sender]) revert InvalidNonce();
        if (usedClaims[claim.claimId]) revert ClaimAlreadyUsed();
        if (rewardedAttempts[claim.attemptId]) revert AttemptAlreadyRewarded();
        if (keccak256(bytes(metadataURI)) != claim.metadataHash) revert InvalidMetadata();
        if (claim.itemType > MAX_ITEM_TYPE) revert InvalidItemType();
        if (claim.rarity > MAX_RARITY) revert InvalidRarity();
        if (claim.power == 0 || claim.power > MAX_POWER) revert InvalidPower();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(MINT_CLAIM_TYPEHASH, claim)));
        if (ECDSA.recover(digest, signature) != rewardSigner) revert UnauthorizedSigner();

        usedClaims[claim.claimId] = true; rewardedAttempts[claim.attemptId] = true; nonces[msg.sender]++;
        tokenId = nextTokenId++;
        itemTypes[tokenId] = claim.itemType; rarities[tokenId] = claim.rarity; powers[tokenId] = claim.power;
        _safeMint(msg.sender, tokenId); _setTokenURI(tokenId, metadataURI);
        emit ItemMinted(tokenId, claim.attemptId, msg.sender, claim.itemType, claim.rarity, claim.power);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}
