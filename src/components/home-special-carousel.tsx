'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const slides = [
  {
    id: 'conservative',
    eyebrow: 'SPECIAL CLASS 01',
    title: 'Conservative Faction',
    subtitle: 'A male SD swordsman driven by growth and freedom',
    body: 'Take on expeditions and special duels with eight exclusive skills, including deregulation, growth drive, national security, and a charging bull.',
    color: '#ff4d55',
    sprite: '/assets/political-duel/political-conservative-sheet.png',
  },
  {
    id: 'special-map',
    eyebrow: 'SPECIAL 1 VS 1 MAP',
    title: 'Faction Duel Special Map',
    subtitle: 'An obstacle-free arena built for a hard-level showdown',
    body: 'The opposing faction appears as a boss using every exclusive skill and more than 12 combat patterns. Move, jump, and dash to win the head-on duel.',
    color: '#9a6728',
    image: '/assets/home/dark-castle.png',
  },
  {
    id: 'progressive',
    eyebrow: 'SPECIAL CLASS 02',
    title: 'Progressive Faction',
    subtitle: 'A female SD mage focused on solidarity and welfare',
    body: 'Control the battlefield with eight exclusive skills, including anti-speculation measures, land transaction permits, a social safety net, and public housing attacks.',
    color: '#42a5ff',
    sprite: '/assets/political-duel/political-progressive-sheet.png',
  },
  {
    id: 'hidden-classes',
    eyebrow: 'HIDDEN CLASS ROSTER',
    title: 'Hidden Classes',
    subtitle: 'Discover specialized heroes beyond the starting roster',
    body: 'Unlock distinctive combat styles such as Ssaulabi sword arts, aerial kick fighting, poison control, pyromancy, colossal weapons, elemental magic, and forbidden curses.',
    color: '#ef5568',
    portrait: '/assets/class-portraits/ssaulabi.png',
  },
  {
    id: 'rare-class',
    eyebrow: 'ULTRA-RARE NFT CLASS',
    title: 'Asset Tycoon',
    subtitle: 'A transferable apex class earned from verified expeditions',
    body: 'Clear eligible late-game stages for a chance to receive the rare class license. Minting the ERC-721 activates nine max-level skills, and ownership moves with the NFT.',
    color: '#b18416',
    portrait: '/assets/class-portraits/assettycoon.png',
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
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Meet special, hidden, and rare classes.</h2>
        </div>
        <p className="max-w-md text-sm font-medium leading-6 text-[#71685d]">Explore faction heroes, their hard 1 VS 1 arena, hidden combat classes, and the ultra-rare NFT class.</p>
      </div>

      <div className="relative md:flex md:items-center md:gap-5">
        <button type="button" onClick={() => move(-1)} aria-label="Previous introduction card" className="absolute left-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[#c5b9aa] bg-white text-[#3a332b] shadow-sm transition hover:bg-[#ebe3d8] md:static md:size-12 md:translate-y-0 md:hover:-translate-x-0.5">
          <ChevronLeft size={24} />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-[#d3c9bb] bg-white shadow-lg">
          <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }} aria-live="polite">
            {slides.map((slide) => (
              <article key={slide.id} className="grid min-w-full items-center gap-6 p-4 pb-7 sm:p-6 md:grid-cols-2 md:gap-8 md:p-10">
                <div className="grid min-h-72 place-items-center overflow-hidden rounded-2xl bg-[#171b22]">
                  {'sprite' in slide ? (
                    <div className="aspect-square w-full max-w-72 bg-no-repeat" style={{ backgroundImage: `url(${slide.sprite})`, backgroundPosition: '0 0', backgroundSize: '800% 100%' }} role="img" aria-label={`${slide.title} SD character`} />
                  ) : 'portrait' in slide ? (
                    <div className="relative h-72 w-full bg-[radial-gradient(circle_at_50%_42%,#4a3b32_0%,#171b22_68%)]">
                      <Image src={slide.portrait} alt={`${slide.title} character portrait`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-contain object-bottom" />
                    </div>
                  ) : (
                    <div className="relative h-72 w-full">
                      <Image src={slide.image} alt="Faction duel special map" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover [image-rendering:pixelated]" />
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
                  <Link href="/game" className="mx-auto mt-7 inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-xl bg-[#211b18] px-6 py-3 text-sm font-bold text-white md:mx-0 md:w-auto">View in Game <ArrowRight size={17} /></Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => move(1)} aria-label="Next introduction card" className="absolute right-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[#c5b9aa] bg-white text-[#3a332b] shadow-sm transition hover:bg-[#ebe3d8] md:static md:size-12 md:translate-y-0 md:hover:translate-x-0.5">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {slides.map((slide, index) => (
          <button key={slide.id} type="button" onClick={() => setActiveIndex(index)} aria-label={`View ${slide.title} introduction`} className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-9 bg-[#51483f]' : 'w-2 bg-[#c8bdaf]'}`} />
        ))}
      </div>
    </div>
  );
}
