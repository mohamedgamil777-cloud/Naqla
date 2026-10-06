/** Naqla brand mark — pickup truck with a parcel + speed lines.
 *  Faces left (matches the Arabic lockup); pass `flip` for the Latin lockup.
 *  The truck uses `currentColor`, so it renders maroon on light and white on maroon. */
export function LogoMark({
  className = "h-8",
  flip = false,
  mono = false,
  surface = "light",
  x,
  y,
  width,
}: {
  className?: string;
  flip?: boolean;
  mono?: boolean;
  /** what the mark sits on: page (light), app header (bar), or a dark panel */
  surface?: "light" | "bar" | "dark";
  /** position/size when nested inside another SVG */
  x?: number;
  y?: number;
  width?: number;
}) {
  // Parcel colour comes from the brand tokens (globals.css) so it follows the active palette.
  const amber = mono ? "currentColor" : `var(--logo-parcel-${surface})`;
  return (
    <svg viewBox="0 0 330 172" x={x} y={y} width={width} height={width ? (width * 172) / 330 : undefined} className={className} style={mono ? undefined : { color: `var(--logo-truck-${surface})` }} aria-hidden="true" fill="none">
      <g transform={flip ? "translate(330 0) scale(-1 1)" : undefined}>
        {/* speed lines + parcel */}
        <path d="M270 17H318M270 41H303" stroke={amber} strokeWidth="11" strokeLinecap="round" />
        <rect x="198" y="6" width="50" height="50" rx="9" fill={amber} />
        {/* truck */}
        <g stroke="currentColor" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round">
          <path d="M56 148H32Q16 148 16 132V116Q16 101 31 99L86 92L117 48Q123 39 135 39H155Q166 39 166 50V86" />
          <path d="M101 145H203" />
          <path d="M300 70Q306 84 302 102Q295 126 263 141" />
        </g>
        <path d="M103 82L124 54Q127 50 132 50H150V82Z" fill="currentColor" />
        <circle cx="76" cy="148" r="19" fill="currentColor" />
        <circle cx="229" cy="148" r="19" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Mark + "نقلة" wordmark (+ optional NAQLA caption). */
export function Logo({
  className = "",
  markClass = "h-7",
  wordClass = "text-2xl",
  caption = false,
  surface = "light",
}: {
  className?: string;
  markClass?: string;
  wordClass?: string;
  caption?: boolean;
  surface?: "light" | "bar" | "dark";
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* RTL: first child sits on the right → truck right of the word, as in the brand lockup */}
      <LogoMark className={markClass} surface={surface} />
      <span className="flex flex-col items-center leading-none">
        <span className={`font-extrabold tracking-tight ${wordClass}`}>نقلة</span>
        {caption && <span className="mt-1 text-[0.55rem] font-bold tracking-[0.35em] opacity-80" dir="ltr">NAQLA</span>}
      </span>
    </span>
  );
}
