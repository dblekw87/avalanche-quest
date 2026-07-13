import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { keccak256, parseEther, toBytes } from 'viem';

export default buildModule('RewardSystem', (module) => {
  const admin = module.getParameter('admin');
  const pauser = module.getParameter('pauser');
  const rewardSigner = module.getParameter('rewardSigner');
  const tokenCap = module.getParameter('tokenCap', parseEther('100000000'));

  const gameToken = module.contract('GameToken', [
    'Avalanche Quest Token',
    'AQT',
    tokenCap,
    admin,
  ]);
  const rewardDistributor = module.contract('RewardDistributor', [
    gameToken,
    admin,
    pauser,
    rewardSigner,
  ]);
  const skillShop = module.contract('SkillShop', [gameToken, admin]);
  const characterUpgrade = module.contract('CharacterUpgrade', [gameToken, admin]);
  const characterUpgradeV2 = module.contract('CharacterUpgradeV2', [gameToken, admin]);
  const characterUpgradeV3 = module.contract('CharacterUpgradeV3', [gameToken, characterUpgradeV2, admin]);
  const skillEnhancement = module.contract('SkillEnhancement', [gameToken, skillShop, admin]);
  const armorEnhancement = module.contract('ArmorEnhancement', [gameToken, skillShop, admin]);
  const gameItem = module.contract('GameItem', [admin, rewardSigner]);
  const marketplace = module.contract('ItemMarketplace', [gameToken, gameItem]);
  const arcaneBoltId = module.getParameter(
    'arcaneBoltId',
    '0x09b6e639b26336afd304d25b7e38127ddaf6faa875b117e2a07da20c9555f036',
  );
  const arcaneBoltPrice = module.getParameter('arcaneBoltPrice', parseEther('25'));
  const minterRole = module.staticCall(gameToken, 'MINTER_ROLE');

  module.call(gameToken, 'grantRole', [minterRole, rewardDistributor]);
  module.call(skillShop, 'setSkillPrice', [arcaneBoltId, arcaneBoltPrice]);
  module.call(skillShop, 'setSkillPrice', ['0xb21dd4f8f48a363c987deb33bf6583a7c2dea57cdbd1d93694ccb6a88f8a803e', parseEther('35')], { id: 'setFrostNovaPrice' });
  module.call(skillShop, 'setSkillPrice', ['0xeba4fdd9a18665966410bab9159a45c2225fc640380108a6b78e3c773d3741ef', parseEther('45')], { id: 'setFlameWavePrice' });
  module.call(skillShop, 'setSkillPrice', ['0xdb1cbd61c8d2dfcec8f05e827f432855f74ae5524fc9b86564f63d01a5219553', parseEther('50')], { id: 'setHealingLightPrice' });
  module.call(skillShop, 'setSkillPrice', ['0x9ba2d36183d154889489a36244c186afa60d068fce385ae5aac572be8509cbf6', parseEther('70')], { id: 'setStarfallPrice' });
  module.call(skillShop, 'setSkillPrice', ['0x15d67238e40e4ce20f5bd6ba811509e2889f30684c50efeb09dee8386b4b9e85', parseEther('25')], { id: 'setMagicMissilePrice' });
  module.call(skillShop, 'setSkillPrice', ['0x8f661b485f3ef310b22e27e1139f3294462a8f4961f6e978fbb25281dd134dce', parseEther('35')], { id: 'setIceStormPrice' });
  module.call(skillShop, 'setSkillPrice', ['0x1646f204c8229670736cf323553b92f2f144b734ab4a315e72116e45751920d0', parseEther('45')], { id: 'setChainLightningPrice' });
  module.call(skillShop, 'setSkillPrice', ['0x8bf4a6f5317ae3c1b537d1d42162cc9bf054934a8816631e3269881065946a7a', parseEther('50')], { id: 'setHealingCirclePrice' });
  module.call(skillShop, 'setSkillPrice', ['0x5eca878acadb653fab33b41e26c8463354701e4f25eb4095c1658fdadb8c0961', parseEther('70')], { id: 'setMeteorPrice' });
  module.call(skillShop, 'setSkillPrice', ['0x61ae6f810a7c1c179b0bd4866a5c692c883fc1ee6bd2b48aa5e2e9196e25e501', parseEther('75')], { id: 'setAegisArmorPrice' });
  const newSkills = [
    ['arcane-cleave', '25'],
    ['twin-phantom', '35'],
    ['rune-step', '45'],
    ['astral-counter', '50'],
    ['constellation-storm', '70'],
    ['gale-arrow', '25'],
    ['split-shot', '35'],
    ['verdant-snare', '45'],
    ['feather-step', '50'],
    ['emerald-rain', '70'],
    ['crescent-fang', '25'],
    ['phantom-cross', '35'],
    ['shadow-reversal', '45'],
    ['azure-focus', '50'],
    ['infinite-blades', '70'],
    ['iron-jab', '25'],
    ['hundred-fists', '35'],
    ['titan-fist', '45'],
    ['burning-spirit', '50'],
    ['heaven-breaker', '70'],
    ['draconic-thrust', '25'],
    ['wingbreaker', '35'],
    ['inferno-breath', '45'],
    ['dragonheart', '50'],
    ['cataclysm-wyvern', '70'],
    ['quickdraw', '25'],
    ['scatter-burst', '35'],
    ['ricochet-round', '45'],
    ['deadeye', '50'],
    ['bullet-tempest', '70'],
  ] as const;
  newSkills.forEach(([slug, price]) => {
    const transactionId = `set_${slug.replaceAll('-', '_')}_price`;
    module.call(skillShop, 'setSkillPrice', [keccak256(toBytes(slug)), parseEther(price)], {
      id: transactionId,
    });
  });

  return { gameToken, rewardDistributor, skillShop, characterUpgrade, characterUpgradeV2, characterUpgradeV3, skillEnhancement, armorEnhancement, gameItem, marketplace };
});
