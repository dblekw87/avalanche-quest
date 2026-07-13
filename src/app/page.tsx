import { ArrowRight, Shield, Sparkles, Swords } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { HomeSpecialCarousel } from '@/components/home-special-carousel';

const features = [
  { icon: Swords, title: '20개의 원정 스테이지', body: '서로 다른 맵과 보스, 고유 공격 패턴을 돌파하세요.' },
  { icon: Sparkles, title: '직업별 스킬과 강화', body: 'AQT로 전사와 마법사의 스킬을 구매하고 능력치를 강화하세요.' },
  { icon: Shield, title: 'NFT 장비와 거래소', body: '보스 장비를 NFT로 발행하고 다른 모험가와 거래하세요.' },
] as const;

export default function Home() {
  return <main className="bg-[#fbfaf7] pt-16 text-[#211c16]">
    <section className="relative isolate min-h-[620px] overflow-hidden border-b border-[#ddd4c7] sm:min-h-[720px]">
      <Image src="/assets/home/expedition-heroes.png" alt="설원의 마법사와 달빛 기사" fill priority sizes="100vw" className="object-cover object-[64%_center]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#fffaf0] via-[#fffaf0]/94 via-40% to-transparent lg:via-[#fffaf0]/72 lg:via-52%" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#e9f2f4]/50 via-transparent to-white/15" />
      <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-5 text-center sm:min-h-[720px] sm:px-6 sm:text-left lg:px-8"><div className="mx-auto max-w-[620px] py-20 sm:mx-0 sm:py-24"><p className="text-[10px] font-bold tracking-[.2em] text-[#62899a] sm:text-xs sm:tracking-[.26em]">PLAY · OWN · TRADE ON AVALANCHE</p><h1 className="font-display mt-6 text-4xl font-bold leading-[.98] text-[#263441] drop-shadow-[0_2px_0_rgba(255,255,255,.8)] sm:text-6xl md:text-8xl">원정을 시작하고<br />전설을 소유하세요.</h1><p className="mt-7 max-w-xl text-sm leading-7 text-[#5d6870] sm:text-base sm:leading-8">보스를 처치해 AQT와 장비를 획득하고, 직업별 스킬과 캐릭터를 강화하는 사이드 스크롤 Web3 RPG입니다.</p><div className="mx-auto mt-10 flex max-w-sm flex-col gap-3 sm:mx-0 sm:max-w-none sm:flex-row sm:flex-wrap"><Link href="/game" className="inline-flex w-full items-center justify-center gap-4 rounded-xl bg-[#426f87] px-7 py-4 font-bold text-white shadow-lg shadow-[#426f87]/25 sm:w-auto">원정 시작 <ArrowRight size={18} /></Link><Link href="/marketplace" className="inline-flex w-full items-center justify-center rounded-xl border border-[#9eb4bd] bg-white/80 px-7 py-4 font-bold backdrop-blur-sm sm:w-auto">거래소 둘러보기</Link></div></div></div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8"><div className="grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, body }) => <article key={title} className="rounded-2xl border border-[#ded6ca] bg-white p-6 text-center shadow-sm sm:p-7 sm:text-left"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#f2e6d5] text-[#9a6728] sm:mx-0"><Icon size={22} /></span><h2 className="mt-5 text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-6 text-[#71685d]">{body}</p></article>)}</div></section>
    <section className="border-y border-[#ded6ca] bg-[#f3efe8]"><HomeSpecialCarousel /></section>
    <section className="border-y border-[#ded6ca] bg-[#f3efe8]"><div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-2 lg:px-8">{([['sky-island', '하늘 섬 스테이지', '매 스테이지마다 달라지는 세계', '푸른 숲부터 심해와 공허, 최종 설원까지 20개의 전장을 탐험하세요.'], ['dark-castle', '어둠의 성', '20종의 보스와 고유 패턴', '돌진, 점프, 지진, 화염, 빙결, 혈마법과 복합 탄막까지 서로 다른 공격을 공략하세요.']] as const).map(([image, alt, title, body]) => <article key={image} className="overflow-hidden rounded-3xl border border-[#d3c9bb] bg-white shadow-lg"><Image src={`/assets/home/${image}.png`} alt={alt} width={512} height={340} className="h-64 w-full object-cover [image-rendering:pixelated]" /><div className="p-7"><h2 className="text-3xl font-bold">{title}</h2><p className="mt-4 leading-7 text-[#71685d]">{body}</p></div></article>)}</div></section>
    <section className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-6 sm:py-24"><p className="text-xs font-bold tracking-[.24em] text-[#9a6728]">AVALANCHE FUJI TESTNET</p><h2 className="mt-4 text-3xl font-bold sm:text-4xl md:text-5xl">당신의 첫 원정을 준비하세요.</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-[#71685d]">지갑을 연결하고 스테이지를 클리어하면 AQT 보상과 NFT 장비를 획득할 수 있습니다.</p><Link href="/game" className="mx-auto mt-8 inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-lg bg-[#211b18] px-8 py-4 font-bold text-white sm:w-auto">게임 시작하기 <ArrowRight size={18} /></Link></section>
  </main>;
}
