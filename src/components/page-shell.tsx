import type { ReactNode } from 'react';
export function PageShell({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children:ReactNode}){
 return <main className="min-h-screen bg-white pt-16"><div className="border-b border-[#e5ded3] bg-[#faf8f4]"><div className="mx-auto max-w-7xl px-4 py-8 text-center sm:px-5 sm:py-10 sm:text-left lg:px-8"><p className="text-[10px] font-bold tracking-[.22em] text-[#9a6728]">{eyebrow}</p><h1 className="font-display mt-2 text-3xl font-black text-[#201c17] sm:text-4xl md:text-5xl">{title}</h1><p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-[#6f685e] sm:mx-0">{description}</p></div></div><div className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-10 lg:px-8">{children}</div></main>;
}
