import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { keccak256, toBytes } from 'viem';

const STARTER_SKILLS = [
  'arcane-bolt', 'magic-missile', 'arcane-cleave', 'gale-arrow',
  'crescent-fang', 'iron-jab', 'draconic-thrust', 'quickdraw',
  'moonlit-draw', 'gale-kick', 'venom-needle', 'ember-lance',
  'iron-crash', 'rending-arc', 'flame-orbit', 'abyss-bolt',
] as const;

export default buildModule('SkillSystemV2', (module) => {
  const admin = module.getParameter('admin');
  const gameToken = module.getParameter('gameToken');
  const legacySkillShop = module.getParameter('legacySkillShop');
  const legacySkillEnhancement = module.getParameter('legacySkillEnhancement');
  const legacyArmorEnhancement = module.getParameter('legacyArmorEnhancement');

  const skillShop = module.contract('SkillShopV2', [gameToken, legacySkillShop, admin]);
  const skillEnhancement = module.contract('SkillEnhancementV2', [gameToken, skillShop, legacySkillEnhancement, admin]);
  const armorEnhancement = module.contract('ArmorEnhancementV2', [gameToken, skillShop, legacyArmorEnhancement, admin]);

  STARTER_SKILLS.forEach((slug) => {
    module.call(skillShop, 'setStarterSkill', [keccak256(toBytes(slug)), true], {
      id: `enable_${slug.replaceAll('-', '_')}`,
    });
  });

  return { skillShop, skillEnhancement, armorEnhancement };
});
