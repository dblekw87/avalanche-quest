// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISkillOwnership {
    function hasSkill(address player, bytes32 skillId) external view returns (bool);
}

contract SkillEnhancement is AccessControl {
    using SafeERC20 for IERC20;
    uint8 public constant MAX_LEVEL = 7;
    uint256 public constant BASE_ENHANCEMENT_PRICE = 20 ether;
    IERC20 public immutable gameToken;
    ISkillOwnership public immutable skillShop;
    mapping(address player => mapping(bytes32 skillId => uint8 level)) public levels;

    error SkillNotOwned();
    error MaxLevelReached();
    error ZeroAddress();
    event SkillEnhanced(address indexed player, bytes32 indexed skillId, uint8 level, uint256 price);

    constructor(address token, address shop, address admin) {
        if (token == address(0) || shop == address(0) || admin == address(0)) revert ZeroAddress();
        gameToken = IERC20(token);
        skillShop = ISkillOwnership(shop);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function priceFor(uint8 currentLevel) public pure returns (uint256) {
        if (currentLevel >= MAX_LEVEL) return 0;
        return BASE_ENHANCEMENT_PRICE * (uint256(1) << currentLevel);
    }

    function enhanceSkill(bytes32 skillId) external {
        if (!skillShop.hasSkill(msg.sender, skillId)) revert SkillNotOwned();
        uint8 currentLevel = levels[msg.sender][skillId];
        if (currentLevel >= MAX_LEVEL) revert MaxLevelReached();
        uint256 price = priceFor(currentLevel);
        uint8 nextLevel = currentLevel + 1;
        levels[msg.sender][skillId] = nextLevel;
        gameToken.safeTransferFrom(msg.sender, address(this), price);
        emit SkillEnhanced(msg.sender, skillId, nextLevel, price);
    }
}
