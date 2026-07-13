// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ItemMarketplace is IERC721Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct Listing { address seller; uint256 tokenId; uint256 price; bool active; }
    IERC20 public immutable gameToken;
    IERC721 public immutable gameItem;
    uint256 public nextListingId = 1;
    mapping(uint256 listingId => Listing listing) public listings;
    error InvalidPrice(); error NotSeller(); error ListingNotActive(); error CannotBuyOwnItem();
    event ItemListed(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 price);
    event ItemPurchased(uint256 indexed listingId, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed listingId);

    constructor(address token, address item) { gameToken = IERC20(token); gameItem = IERC721(item); }

    function createListing(uint256 tokenId, uint256 price) external nonReentrant returns (uint256 listingId) {
        if (price == 0) revert InvalidPrice();
        gameItem.safeTransferFrom(msg.sender, address(this), tokenId);
        listingId = nextListingId++;
        listings[listingId] = Listing(msg.sender, tokenId, price, true);
        emit ItemListed(listingId, msg.sender, tokenId, price);
    }
    function buy(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        if (!listing.active) revert ListingNotActive();
        if (listing.seller == msg.sender) revert CannotBuyOwnItem();
        listing.active = false;
        gameToken.safeTransferFrom(msg.sender, listing.seller, listing.price);
        gameItem.safeTransferFrom(address(this), msg.sender, listing.tokenId);
        emit ItemPurchased(listingId, msg.sender, listing.price);
    }
    function cancel(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        if (!listing.active) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotSeller();
        listing.active = false; gameItem.safeTransferFrom(address(this), msg.sender, listing.tokenId);
        emit ListingCancelled(listingId);
    }
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
