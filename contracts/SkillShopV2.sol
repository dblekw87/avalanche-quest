// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ILegacySkillShop {
    function hasSkill(address player, bytes32 skillId) external view returns (bool);
    function skillPrices(bytes32 skillId) external view returns (uint256);
}

contract SkillShopV2 is AccessControl {
    using SafeERC20 for IERC20;

    IERC20 public immutable gameToken;
    ILegacySkillShop public immutable legacySkillShop;
    mapping(bytes32 skillId => uint256 price) public skillPrices;
    mapping(bytes32 skillId => bool starter) public starterSkills;
    mapping(address player => mapping(bytes32 skillId => bool owned)) private _hasSkill;

    error InvalidSkill();
    error SkillAlreadyOwned();
    error ZeroAddress();

    event SkillPriceSet(bytes32 indexed skillId, uint256 price);
    event StarterSkillSet(bytes32 indexed skillId, bool enabled);
    event SkillPurchased(address indexed player, bytes32 indexed skillId, uint256 price);

    constructor(address token, address legacyShop, address admin) {
        if (token == address(0) || legacyShop == address(0) || admin == address(0)) revert ZeroAddress();
        gameToken = IERC20(token);
        legacySkillShop = ILegacySkillShop(legacyShop);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function hasSkill(address player, bytes32 skillId) public view returns (bool) {
        return starterSkills[skillId] || _hasSkill[player][skillId] || legacySkillShop.hasSkill(player, skillId);
    }

    function setSkillPrice(bytes32 skillId, uint256 price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (skillId == bytes32(0) || price == 0) revert InvalidSkill();
        skillPrices[skillId] = price;
        emit SkillPriceSet(skillId, price);
    }

    function setStarterSkill(bytes32 skillId, bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (skillId == bytes32(0)) revert InvalidSkill();
        starterSkills[skillId] = enabled;
        emit StarterSkillSet(skillId, enabled);
    }

    function purchaseSkill(bytes32 skillId) external {
        uint256 price = skillPrices[skillId];
        if (price == 0) price = legacySkillShop.skillPrices(skillId);
        if (price == 0) revert InvalidSkill();
        if (hasSkill(msg.sender, skillId)) revert SkillAlreadyOwned();
        _hasSkill[msg.sender][skillId] = true;
        gameToken.safeTransferFrom(msg.sender, address(this), price);
        emit SkillPurchased(msg.sender, skillId, price);
    }

    function withdraw(address recipient, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert ZeroAddress();
        gameToken.safeTransfer(recipient, amount);
    }
}
