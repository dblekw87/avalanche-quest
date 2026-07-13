// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CharacterUpgradeV2 is AccessControl {
    using SafeERC20 for IERC20;

    enum UpgradeType { Attack, Vitality, Defense, Skill }
    uint8 public constant MAX_LEVEL = 5;
    IERC20 public immutable gameToken;
    mapping(address player => mapping(UpgradeType upgradeType => uint8 level)) public levels;

    error MaxLevelReached();
    error ZeroAddress();
    event UpgradePurchased(address indexed player, UpgradeType indexed upgradeType, uint8 level, uint256 price);

    constructor(address token, address admin) {
        if (token == address(0) || admin == address(0)) revert ZeroAddress();
        gameToken = IERC20(token);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function priceFor(UpgradeType upgradeType, uint8 currentLevel) public pure returns (uint256) {
        if (currentLevel >= MAX_LEVEL) return 0;
        uint256 basePrice;
        if (upgradeType == UpgradeType.Attack) basePrice = 30 ether;
        else if (upgradeType == UpgradeType.Vitality) basePrice = 25 ether;
        else if (upgradeType == UpgradeType.Defense) basePrice = 35 ether;
        else basePrice = 40 ether;
        return basePrice + uint256(currentLevel) * 15 ether;
    }

    function purchaseUpgrade(UpgradeType upgradeType) external {
        uint8 currentLevel = levels[msg.sender][upgradeType];
        if (currentLevel >= MAX_LEVEL) revert MaxLevelReached();
        uint256 price = priceFor(upgradeType, currentLevel);
        uint8 nextLevel = currentLevel + 1;
        levels[msg.sender][upgradeType] = nextLevel;
        gameToken.safeTransferFrom(msg.sender, address(this), price);
        emit UpgradePurchased(msg.sender, upgradeType, nextLevel, price);
    }

    function withdraw(address recipient, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert ZeroAddress();
        gameToken.safeTransfer(recipient, amount);
    }
}
