'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Gamepad2, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  ['/game', 'Adventure'],
  ['/inventory', 'Inventory'],
  ['/marketplace', 'Marketplace'],
  ['/history', 'History'],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e5ded3] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-8">
        <Link href="/" className="mr-2 flex min-w-0 items-center gap-2 sm:mr-8 sm:gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#9a6728] text-white shadow-[0_5px_14px_rgba(154,103,40,.24)]">
            <Gamepad2 size={18} strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <strong className="font-display block truncate text-sm leading-none text-[#201c17] sm:text-lg">AVALANCHE QUEST</strong>
            <span className="mt-1 hidden text-[8px] font-bold tracking-[.24em] text-[#9a6728] sm:block">PLAY · OWN · TRADE</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-[#f6f2eb] p-1 md:flex">
          {links.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${active ? 'bg-white text-[#7f531f] shadow-sm' : 'text-[#6f685e] hover:bg-white/70 hover:text-[#201c17]'}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden origin-right scale-90 md:block">
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
        </div>
        <div className="ml-auto shrink-0 md:hidden">
          <ConnectButton.Custom>
            {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
              const connected = mounted && account && chain;
              const action = !connected ? openConnectModal : chain.unsupported ? openChainModal : openAccountModal;
              const label = !connected ? 'Connect Wallet' : chain.unsupported ? 'Switch Network' : `${account.address.slice(0, 4)}…${account.address.slice(-3)}`;
              return (
                <button type="button" onClick={action} className="rounded-lg border border-[#d7c9b6] bg-[#f6f2eb] px-2.5 py-2 text-[10px] font-bold text-[#6f4b22]">
                  {label}
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>
        <button type="button" className="ml-1 grid size-10 place-items-center rounded-xl bg-[#f6f2eb] text-[#51493f] md:hidden" onClick={() => setOpen(!open)} aria-label="Open menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#eee7dc] bg-white p-4 shadow-lg md:hidden">
          <nav className="grid gap-1">
            {links.map(([href, label]) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} onClick={() => setOpen(false)} className={`rounded-xl px-4 py-3 text-sm font-semibold ${active ? 'bg-[#f3eadc] text-[#7f531f]' : 'text-[#51493f] hover:bg-[#f8f5ef]'}`}>{label}</Link>;
            })}
          </nav>
          <div className="mt-4 border-t border-[#eee7dc] pt-4"><ConnectButton accountStatus="address" showBalance={false} /></div>
        </div>
      ) : null}
    </header>
  );
}
