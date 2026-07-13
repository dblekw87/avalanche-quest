// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SkillShop is AccessControl {
    using SafeERC20 for IERC20;

    IERC20 public immutable gameToken;
    mapping(bytes32 skillId => uint256 price) public skillPrices;
    mapping(address player => mapping(bytes32 skillId => bool owned)) public hasSkill;

    error InvalidSkill();
    error SkillAlreadyOwned();
    error ZeroAddress();

    event SkillPriceSet(bytes32 indexed skillId, uint256 price);
    event SkillPurchased(address indexed player, bytes32 indexed skillId, uint256 price);

    constructor(address token, address admin) {
        if (token == address(0) || admin == address(0)) revert ZeroAddress();
        gameToken = IERC20(token);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setSkillPrice(bytes32 skillId, uint256 price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (skillId == bytes32(0) || price == 0) revert InvalidSkill();
        skillPrices[skillId] = price;
        emit SkillPriceSet(skillId, price);
    }

    function purchaseSkill(bytes32 skillId) external {
        uint256 price = skillPrices[skillId];
        if (price == 0) revert InvalidSkill();
        if (hasSkill[msg.sender][skillId]) revert SkillAlreadyOwned();

        hasSkill[msg.sender][skillId] = true;
        gameToken.safeTransferFrom(msg.sender, address(this), price);
        emit SkillPurchased(msg.sender, skillId, price);
    }

    function withdraw(address recipient, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert ZeroAddress();
        gameToken.safeTransfer(recipient, amount);
    }
}
