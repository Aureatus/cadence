import { Link, Outlet } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function RootLayout() {
  return (
    <main className="relative z-[1] mx-auto min-h-svh w-full max-w-[2200px] overflow-x-clip px-5 pt-4 pb-16 md:px-11 md:pt-7 md:pb-20 xl:px-12 xl:pt-6 2xl:px-20 2xl:pt-10 2xl:pb-28 3xl:px-28 3xl:pt-12">
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6">
        <BrandLink />
        <PrimaryNav />
      </header>
      <Outlet />
    </main>
  );
}

function BrandLink() {
  return (
    <Link
      to="/"
      className="flex min-w-0 max-w-full items-center gap-4 text-moon no-underline"
      aria-label="Cadence home"
    >
      <span className="moon-mark size-9 md:size-[46px]" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block font-display text-[22px] italic leading-[0.85] tracking-[-0.005em] md:text-4xl">
          Cadence
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.16em] text-foam opacity-60 md:text-[10px] md:tracking-[0.26em]">
          small tides, kept
        </span>
      </span>
    </Link>
  );
}

const navLinks = [
  { to: "/", label: "Today", num: "i", exact: true },
  { to: "/history", label: "History", num: "ii", exact: false },
] as const;

function PrimaryNav() {
  return (
    <nav
      aria-label="Primary navigation"
      className="flex w-full min-w-0 items-baseline justify-between gap-6 font-display md:w-auto md:justify-end md:gap-0"
    >
      {navLinks.map((item, index) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact }}
          className={cn(
            "group/tab relative min-w-0 flex-1 truncate text-center font-display italic leading-tight no-underline transition-colors md:flex-initial md:px-4",
            "text-[clamp(14px,4.4vw,18px)] text-moon/40 hover:text-moon-2 md:text-[22px]",
            "data-[status=active]:text-moon-2",
            index > 0 &&
              "before:pointer-events-none before:absolute before:inset-y-[18%] before:left-0 before:w-px before:bg-foam/20 md:before:hidden",
          )}
        >
          <span className="relative -top-2.5 block font-mono text-[9px] not-italic tracking-[0.25em] text-moon/30 group-data-[status=active]/tab:text-coral md:top-0 md:mb-1">
            {item.num}
          </span>
          {item.label}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -bottom-2.5 h-px bg-gradient-to-r from-transparent via-coral via-50% to-transparent opacity-0 group-data-[status=active]/tab:opacity-100"
          />
        </Link>
      ))}
    </nav>
  );
}
