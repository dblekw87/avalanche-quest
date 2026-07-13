// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ILegacyCharacterUpgrade {
    function levels(address player, uint8 upgradeType) external view returns (uint8);
}

contract CharacterUpgradeV3 is AccessControl {
    using SafeERC20 for IERC20;

    enum UpgradeType { Attack, Vitality, Defense }

    uint8 public constant MAX_LEVEL = 20;
    uint256 public constant PRICE_MULTIPLIER_PERCENT = 120;
    IERC20 public immutable gameToken;
    ILegacyCharacterUpgrade public immutable legacyUpgrade;
    mapping(address player => mapping(UpgradeType upgradeType => uint8 level)) private _levels;

    error MaxLevelReached();
    error ZeroAddress();

    event UpgradePurchased(address indexed player, UpgradeType indexed upgradeType, uint8 level, uint256 price);

    constructor(address token, address legacy, address admin) {
        if (token == address(0) || legacy == address(0) || admin == address(0)) revert ZeroAddress();
        gameToken = IERC20(token);
        legacyUpgrade = ILegacyCharacterUpgrade(legacy);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function levels(address player, UpgradeType upgradeType) public view returns (uint8) {
        uint8 currentLevel = _levels[player][upgradeType];
        uint8 legacyLevel = legacyUpgrade.levels(player, uint8(upgradeType));
        return currentLevel >= legacyLevel ? currentLevel : legacyLevel;
    }

    function priceFor(UpgradeType upgradeType, uint8 currentLevel) public pure returns (uint256) {
        if (currentLevel >= MAX_LEVEL) return 0;

        uint256 price = upgradeType == UpgradeType.Attack
            ? 30 ether
            : upgradeType == UpgradeType.Vitality
                ? 25 ether
                : 35 ether;

        for (uint8 level = 0; level < currentLevel; level++) {
            price = price * PRICE_MULTIPLIER_PERCENT / 100;
        }
        return price;
    }

    function purchaseUpgrade(UpgradeType upgradeType) external {
        uint8 currentLevel = levels(msg.sender, upgradeType);
        if (currentLevel >= MAX_LEVEL) revert MaxLevelReached();

        uint256 price = priceFor(upgradeType, currentLevel);
        uint8 nextLevel = currentLevel + 1;
        _levels[msg.sender][upgradeType] = nextLevel;
        gameToken.safeTransferFrom(msg.sender, address(this), price);
        emit UpgradePurchased(msg.sender, upgradeType, nextLevel, price);
    }

    function withdraw(address recipient, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert ZeroAddress();
        gameToken.safeTransfer(recipient, amount);
    }
}
