import Image from 'next/image';

import type { InnateCharacterId } from '@/game/characters';
import { innateClasses, innateSkillIcon } from '@/game/innate-classes';

type InnateClassLoadoutProps = {
  characterId: InnateCharacterId;
};

export function InnateClassLoadout({ characterId }: InnateClassLoadoutProps) {
  const definition = innateClasses[characterId];
  const dualblade = characterId === 'dualblade';
  const areaFrame = dualblade
    ? 'border-[#3aaec9] shadow-[inset_0_0_28px_rgba(58,174,201,.16),0_0_18px_rgba(58,174,201,.14)]'
    : 'border-[#c5792c] shadow-[inset_0_0_28px_rgba(197,121,44,.16),0_0_18px_rgba(197,121,44,.14)]';
  const cardFrame = dualblade
    ? 'border-[#62dff4] shadow-[inset_0_0_16px_rgba(98,223,244,.12),0_0_12px_rgba(98,223,244,.18)]'
    : 'border-[#f2a640] shadow-[inset_0_0_16px_rgba(242,166,64,.12),0_0_12px_rgba(242,166,64,.18)]';

  return (
    <section className={`mb-4 rounded-2xl border-2 bg-[#111417] p-4 sm:p-5 ${areaFrame}`}>
      <div className="text-center sm:text-left">
        <p className="text-[10px] font-bold tracking-[.2em]" style={{ color: definition.accent }}>INNATE CLASS LOADOUT · 5 SKILLS UNLOCKED</p>
        <h3 className="mt-2 text-xl font-black text-[#f4ead8]">{definition.name} 전용 스킬</h3>
        <p className="mt-2 text-xs leading-5 text-[#b8ad9d]">{definition.role}. 모든 스킬은 클래스 선택 즉시 기본 해금되며 R은 유일한 버프 스킬입니다.</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {definition.skills.map((skill) => (
          <article key={skill.id} className={`relative overflow-hidden rounded-xl border-2 bg-[#090b0d] p-3 text-center ${cardFrame}`}>
            <span className="absolute left-2 top-2 z-10 grid size-7 place-items-center rounded-full border border-white/50 bg-black/85 text-[10px] font-black text-white">{skill.key}</span>
            {skill.buff ? <span className="absolute right-2 top-2 z-10 rounded-full border border-[#ffe09a] bg-[#6d4b14]/90 px-2 py-1 text-[8px] font-black text-[#fff1bd]">BUFF</span> : null}
            <div className={`mx-auto size-24 overflow-hidden rounded-xl border-2 bg-black sm:size-28 ${cardFrame}`}>
              <Image src={innateSkillIcon(skill.id)} alt={`${skill.name} 스킬 아이콘`} width={112} height={112} unoptimized className="size-full object-cover" />
            </div>
            <strong className="mt-3 block text-sm text-[#f6ead4]">{skill.name}</strong>
            <p className="mt-1 min-h-10 text-[10px] leading-4 text-[#a99f90]">{skill.description}</p>
            <span className="mt-2 block text-[9px] font-bold" style={{ color: definition.accent }}>{skill.buff ? '5초 강화' : `POWER ${skill.damage}`} · {(skill.cooldownMs / 1000).toFixed(1)}s</span>
          </article>
        ))}
      </div>
    </section>
  );
}
