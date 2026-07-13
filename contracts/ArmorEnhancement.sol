// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IArmorOwnership {
    function hasSkill(address player, bytes32 skillId) external view returns (bool);
}

contract ArmorEnhancement is AccessControl {
    using SafeERC20 for IERC20;

    uint8 public constant MAX_LEVEL = 5;
    bytes32 public constant AEGIS_ARMOR_ID = keccak256("aegis-armor");
    IERC20 public immutable gameToken;
    IArmorOwnership public immutable skillShop;
    mapping(address player => uint8 level) public levels;

    error ArmorNotOwned();
    error MaxLevelReached();
    error ZeroAddress();
    event ArmorEnhanced(address indexed player, uint8 level, uint256 price);

    constructor(address token, address shop, address admin) {
        if (token == address(0) || shop == address(0) || admin == address(0)) revert ZeroAddress();
        gameToken = IERC20(token);
        skillShop = IArmorOwnership(shop);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function priceFor(uint8 currentLevel) public pure returns (uint256) {
        if (currentLevel >= MAX_LEVEL) return 0;
        return 200 ether + uint256(currentLevel) * 200 ether;
    }

    function enhanceArmor() external {
        if (!skillShop.hasSkill(msg.sender, AEGIS_ARMOR_ID)) revert ArmorNotOwned();
        uint8 currentLevel = levels[msg.sender];
        if (currentLevel >= MAX_LEVEL) revert MaxLevelReached();
        uint256 price = priceFor(currentLevel);
        levels[msg.sender] = currentLevel + 1;
        gameToken.safeTransferFrom(msg.sender, address(this), price);
        emit ArmorEnhanced(msg.sender, currentLevel + 1, price);
    }
}
