export function DataPageSkeleton({ variant = 'cards' }: { variant?: 'cards' | 'rows' }) {
  return (
    <main className="data-skeleton min-h-screen bg-[#0e110d] px-6 pb-20 pt-28 text-[#eadcc0]">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-3 w-36 bg-[#514535]" />
        <div className="mt-5 h-10 w-80 max-w-full bg-[#3b3227]" />
        <div className="mt-4 h-4 w-[520px] max-w-full bg-[#302921]" />
        {variant === 'cards' ? (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="border border-[#554938] bg-[#1c1813] p-4"><div className="mx-auto aspect-square w-32 bg-[#332b22]"/><div className="mt-5 h-3 w-20 bg-[#4a3f31]"/><div className="mt-4 h-6 w-2/3 bg-[#40362a]"/><div className="mt-4 h-3 w-full bg-[#302921]"/><div className="mt-2 h-3 w-4/5 bg-[#302921]"/><div className="mt-6 h-10 w-full bg-[#40362a]"/></div>)}
          </div>
        ) : (
          <div className="mt-12 border-t border-[#554938]">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="grid gap-4 border-b border-[#493e31] py-6 md:grid-cols-[90px_80px_1fr_150px]"><div className="h-3 w-16 bg-[#40362a]"/><div className="size-16 bg-[#332b22]"/><div><div className="h-5 w-40 bg-[#40362a]"/><div className="mt-3 h-3 w-28 bg-[#302921]"/></div><div className="h-9 bg-[#40362a]"/></div>)}
          </div>
        )}
      </div>
    </main>
  );
}
