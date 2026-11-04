export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-label="Maintenix logo">
      <rect width="40" height="40" rx="9" className="fill-sidebar-accent" />
      <path d="M9 29V11l11 11 11-11v18" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="stroke-sidebar-primary" />
      <circle cx="20" cy="29" r="2.6" className="fill-sidebar-primary" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo />
      <div className="leading-none">
        <div className="font-display text-[15px] font-bold tracking-tight">MAINTENIX</div>
        <div className="mt-0.5 font-mono text-[9px] tracking-[0.25em] opacity-70">INTELLIGENT · GMAO 4.0</div>
      </div>
    </div>
  );
}
