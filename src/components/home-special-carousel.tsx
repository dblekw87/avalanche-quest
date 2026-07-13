'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const slides = [
  {
    id: 'conservative',
    eyebrow: 'SPECIAL CLASS 01',
    title: '보수 진영',
    subtitle: '성장과 자유를 앞세운 남성 SD 검사',
    body: '규제 철폐, 성장 드라이브, 국가 안보 강화와 황소 돌진을 포함한 8개의 전용 스킬로 일반 원정과 스페셜 대전을 플레이합니다.',
    color: '#ff4d55',
    sprite: '/assets/political-duel/political-conservative-sheet.png',
  },
  {
    id: 'special-map',
    eyebrow: 'SPECIAL 1 VS 1 MAP',
    title: '진영 대결 스페셜 맵',
    subtitle: '장애물 없는 하드 레벨 전용 아레나',
    body: '선택하지 않은 반대 진영이 모든 전용 스킬과 12개 이상의 전투 패턴을 사용하는 보스로 등장합니다. 이동, 점프와 대시를 활용해 정면 승부하세요.',
    color: '#9a6728',
    image: '/assets/home/dark-castle.png',
  },
  {
    id: 'progressive',
    eyebrow: 'SPECIAL CLASS 02',
    title: '진보 진영',
    subtitle: '연대와 복지를 다루는 여성 SD 마도사',
    body: '부동산 투기 억제, 토지거래허가제, 사회 안전망과 공공임대 공격을 포함한 8개의 전용 스킬로 전장을 넓게 제어합니다.',
    color: '#42a5ff',
    sprite: '/assets/political-duel/political-progressive-sheet.png',
  },
] as const;

export function HomeSpecialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const move = (direction: -1 | 1) => setActiveIndex((current) => (current + direction + slides.length) % slides.length);

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-center gap-4 text-center sm:mb-10 sm:justify-between sm:text-left">
        <div className="w-full sm:w-auto">
          <p className="text-xs font-bold tracking-[.24em] text-[#9a6728]">NEW SPECIAL CONTENT</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">두 진영과 새로운 대결을 만나보세요.</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-[#71685d]">보수·진보 스페셜 클래스와 1 VS 1 하드 아레나를 카드로 살펴보세요.</p>
      </div>

      <div className="relative md:flex md:items-center md:gap-5">
        <button type="button" onClick={() => move(-1)} aria-label="이전 소개 카드" className="absolute left-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[#c5b9aa] bg-white text-[#3a332b] shadow-sm transition hover:bg-[#ebe3d8] md:static md:size-12 md:translate-y-0 md:hover:-translate-x-0.5">
          <ChevronLeft size={24} />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-[#d3c9bb] bg-white shadow-lg">
          <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }} aria-live="polite">
            {slides.map((slide) => (
              <article key={slide.id} className="grid min-w-full items-center gap-6 p-4 pb-7 sm:p-6 md:grid-cols-2 md:gap-8 md:p-10">
                <div className="grid min-h-72 place-items-center overflow-hidden rounded-2xl bg-[#171b22]">
                  {'sprite' in slide ? (
                    <div className="aspect-square w-full max-w-72 bg-no-repeat" style={{ backgroundImage: `url(${slide.sprite})`, backgroundPosition: '0 0', backgroundSize: '800% 100%' }} role="img" aria-label={`${slide.title} SD 캐릭터`} />
                  ) : (
                    <div className="relative h-72 w-full">
                      <Image src={slide.image} alt="진영 대결 스페셜 맵" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover [image-rendering:pixelated]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#11151c]/70 to-transparent" />
                      <span className="absolute bottom-5 left-5 rounded-full border border-white/35 bg-black/35 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">HARD · NO OBSTACLES · 12+ PATTERNS</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold tracking-[.22em]" style={{ color: slide.color }}>{slide.eyebrow}</p>
                  <h3 className="mt-3 text-4xl font-black" style={{ color: slide.color }}>{slide.title}</h3>
                  <strong className="mt-3 block text-lg text-[#332d26]">{slide.subtitle}</strong>
                  <p className="mt-5 text-sm leading-7 text-[#71685d]">{slide.body}</p>
                  <Link href="/game" className="mx-auto mt-7 inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-xl bg-[#211b18] px-6 py-3 text-sm font-bold text-white md:mx-0 md:w-auto">게임에서 확인하기 <ArrowRight size={17} /></Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => move(1)} aria-label="다음 소개 카드" className="absolute right-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[#c5b9aa] bg-white text-[#3a332b] shadow-sm transition hover:bg-[#ebe3d8] md:static md:size-12 md:translate-y-0 md:hover:translate-x-0.5">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {slides.map((slide, index) => (
          <button key={slide.id} type="button" onClick={() => setActiveIndex(index)} aria-label={`${slide.title} 소개 보기`} className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-9 bg-[#51483f]' : 'w-2 bg-[#c8bdaf]'}`} />
        ))}
      </div>
    </div>
  );
}
