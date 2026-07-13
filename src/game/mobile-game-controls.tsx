'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';

import { isInnateCharacter, isPoliticalCharacter, type CharacterId, type GeneralCharacterId } from '@/game/characters';
import { innateClasses, innateSkillIcon } from '@/game/innate-classes';
import { politicalFighters, type PoliticalFaction } from '@/game/political-duel/definitions';

export type MobileGameAction = 'left' | 'right' | 'jump' | 'dash' | 'attack';
export type MobileSkillButton = { id: string; label: string; name: string; iconUrl: string; disabled?: boolean };

const GENERAL_SKILLS: Readonly<Record<Exclude<GeneralCharacterId, 'dualblade' | 'brawler'>, readonly string[]>> = {
  warrior: ['arcane-bolt', 'frost-nova', 'flame-wave', 'healing-light', 'starfall'],
  mage: ['magic-missile', 'ice-storm', 'chain-lightning', 'healing-circle', 'meteor'],
  spellblade: ['arcane-cleave', 'twin-phantom', 'rune-step', 'astral-counter', 'constellation-storm'],
  archer: ['gale-arrow', 'split-shot', 'verdant-snare', 'feather-step', 'emerald-rain'],
};

export function questMobileSkills(characterId: CharacterId, ownedSkillIds: readonly string[]): readonly MobileSkillButton[] {
  if (isPoliticalCharacter(characterId)) {
    return politicalFighters[characterId].skills.map((skill) => {
      const id = `${characterId}-${skill.key.toLowerCase()}`;
      return { id, label: skill.key, name: skill.name, iconUrl: `/assets/political-duel/skill-vfx/${id}.png`, disabled: !ownedSkillIds.includes(id) };
    });
  }
  if (isInnateCharacter(characterId)) {
    return innateClasses[characterId].skills.map((skill) => ({
      id: skill.id,
      label: skill.key,
      name: skill.name,
      iconUrl: innateSkillIcon(skill.id),
      disabled: !ownedSkillIds.includes(skill.id),
    }));
  }
  const labels = ['Q', 'W', 'E', 'R', 'T'];
  return GENERAL_SKILLS[characterId].map((id, index) => ({ id, label: labels[index] ?? '?', name: id, iconUrl: `/assets/skills-v2/${id}.png`, disabled: !ownedSkillIds.includes(id) }));
}

export function duelMobileSkills(faction: PoliticalFaction): readonly MobileSkillButton[] {
  return politicalFighters[faction].skills.map((skill) => ({
    id: skill.key,
    label: skill.key,
    name: skill.name,
    iconUrl: `/assets/political-duel/skill-vfx/${faction}-${skill.key.toLowerCase()}.png`,
  }));
}

type MobileGameControlsProps = {
  skills: readonly MobileSkillButton[];
  onAction: (action: MobileGameAction, active: boolean) => void;
  onSkill: (skillId: string) => void;
  onFullscreen: () => void;
};

function stopPointer(event: ReactPointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
  event.stopPropagation();
}

export function MobileGameControls({ skills, onAction, onSkill, onFullscreen }: MobileGameControlsProps) {
  const holdHandlers = (action: MobileGameAction) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      stopPointer(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      onAction(action, true);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
      stopPointer(event);
      onAction(action, false);
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => {
      stopPointer(event);
      onAction(action, false);
    },
    onLostPointerCapture: () => onAction(action, false),
  });

  return (
    <div className="mobile-touch-controls pointer-events-none absolute inset-0 z-30 select-none touch-none" aria-label="모바일 게임 조작">
      <div className="mobile-landscape-prompt pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-white/30 bg-black/75 px-4 py-2 text-[11px] font-bold text-white">
        휴대폰을 가로로 돌리면 게임 화면이 커집니다
      </div>
      <button type="button" onPointerDown={(event) => { stopPointer(event); onFullscreen(); }} className="pointer-events-auto absolute left-2 top-2 rounded-lg border border-white/30 bg-black/70 px-2.5 py-2 text-[9px] font-bold text-white sm:left-3 sm:top-3 sm:px-3 sm:text-[10px]">
        전체화면
      </button>

      <div className="mobile-move-pad pointer-events-auto absolute bottom-[max(.75rem,env(safe-area-inset-bottom))] left-3 flex gap-2">
        <button type="button" aria-label="왼쪽 이동" {...holdHandlers('left')} className="mobile-control-button">◀</button>
        <button type="button" aria-label="오른쪽 이동" {...holdHandlers('right')} className="mobile-control-button">▶</button>
      </div>

      <div className="mobile-action-pad pointer-events-auto absolute bottom-[max(.75rem,env(safe-area-inset-bottom))] right-3 flex gap-2">
        <button type="button" aria-label="점프" {...holdHandlers('jump')} className="mobile-control-button mobile-control-button--jump">점프</button>
        <button type="button" aria-label="대시" {...holdHandlers('dash')} className="mobile-control-button mobile-control-button--dash">대시</button>
        <button type="button" aria-label="기본 공격" {...holdHandlers('attack')} className="mobile-control-button mobile-control-button--attack">공격</button>
      </div>

      <div className="mobile-skill-dock pointer-events-auto absolute bottom-[max(4.9rem,calc(env(safe-area-inset-bottom)+4.2rem))] left-1/2 flex -translate-x-1/2 gap-1.5 rounded-2xl border border-white/15 bg-black/55 p-1.5 backdrop-blur-sm">
        {skills.map((skill) => (
          <button
            key={skill.id}
            type="button"
            disabled={skill.disabled}
            onPointerDown={(event) => {
              stopPointer(event);
              onSkill(skill.id);
            }}
            className="mobile-skill-button"
            aria-label={`${skill.name} 스킬`}
            title={skill.name}
          >
            <span className="mobile-skill-button__icon" style={{ backgroundImage: `url(${skill.iconUrl})` }} />
            <span className="mobile-skill-button__key">{skill.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
