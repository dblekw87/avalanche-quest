import Link from 'next/link';

export function SiteFooter() {
  return <footer className="border-t border-[#ded6ca] bg-[#17130f] text-[#c8bbaa]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-center md:grid-cols-[1fr_auto] md:items-end md:text-left lg:px-8"><div><strong className="font-display text-2xl text-white">AVALANCHE QUEST</strong><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#8f8578] md:mx-0">Avalanche Fuji Testnet에서 동작하는 사이드 스크롤 Web3 RPG입니다.</p><p className="mt-5 text-sm text-[#d0a55f]">제작자 <strong>PANGWOO</strong></p></div><nav className="flex flex-wrap justify-center gap-5 text-sm md:justify-end"><Link href="/game">모험</Link><Link href="/inventory">가방</Link><Link href="/marketplace">거래소</Link><Link href="/history">기록</Link></nav></div><div className="border-t border-white/10 px-6 py-5 text-center text-xs text-[#756d63]">© 2026 PANGWOO. Built on Avalanche Fuji.</div></footer>;
}
