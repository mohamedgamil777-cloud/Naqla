import { LogoMark } from "@/components/Logo";

/** Home hero illustration: a Naqla pickup loaded with boxes, Giza pyramids behind.
 *  Pure SVG (no photo needed); swap for a real photo later if wanted. */
export function HeroScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 190" className={className} role="img" aria-label="عربية نقلة محمّلة صناديق">
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7efe0" />
          <stop offset="1" stopColor="#efe2c8" />
        </linearGradient>
        <linearGradient id="hs-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9c9a8" />
          <stop offset="1" stopColor="#cbb88f" />
        </linearGradient>
      </defs>

      {/* sky + sun */}
      <rect width="360" height="190" fill="url(#hs-sky)" />
      <circle cx="70" cy="44" r="20" fill="#f6d79a" opacity="0.7" />

      {/* pyramids */}
      <path d="M150 128 L205 52 L262 128 Z" fill="#e2c995" />
      <path d="M205 52 L262 128 L222 128 Z" fill="#cfb17a" />
      <path d="M240 128 L280 74 L322 128 Z" fill="#e6d0a2" />
      <path d="M280 74 L322 128 L292 128 Z" fill="#d4b984" />
      <path d="M118 128 L142 96 L168 128 Z" fill="#e8d4a9" />

      {/* distant city */}
      <g fill="#cdbf9f" opacity="0.8">
        <rect x="8" y="102" width="16" height="26" />
        <rect x="26" y="92" width="12" height="36" />
        <rect x="40" y="108" width="18" height="20" />
        <rect x="60" y="98" width="10" height="30" />
        <rect x="72" y="110" width="20" height="18" />
        <rect x="328" y="104" width="14" height="24" />
        <rect x="344" y="96" width="12" height="32" />
      </g>

      {/* ground */}
      <rect y="126" width="360" height="64" fill="url(#hs-road)" />
      <ellipse cx="190" cy="168" rx="130" ry="9" fill="#10201c" opacity="0.14" />

      {/* boxes in the bed */}
      <g stroke="#a7783f" strokeWidth="1.2">
        <rect x="88" y="98" width="38" height="30" rx="2" fill="#cf9f63" />
        <rect x="128" y="92" width="44" height="36" rx="2" fill="#d6a86c" />
        <rect x="174" y="102" width="34" height="26" rx="2" fill="#c99459" />
        <rect x="104" y="74" width="34" height="24" rx="2" fill="#dcb179" />
        <rect x="140" y="70" width="30" height="22" rx="2" fill="#cf9f63" />
      </g>
      <g stroke="#e9cf9f" strokeWidth="2.5">
        <path d="M107 98v30M150 92v36M191 102v26M121 74v24M155 70v22" />
      </g>

      {/* truck body */}
      <g stroke="#b9c2bf" strokeWidth="1.5" strokeLinejoin="round">
        <rect x="76" y="126" width="140" height="30" rx="4" fill="#ffffff" />
        <path d="M216 156V98q0-8 8-8h42q8 0 13 7l19 26q22 3 26 14v19z" fill="#ffffff" />
      </g>
      <path d="M226 98h38l17 24h-55z" fill="#9db9b5" />
      <path d="M248 98v24" stroke="#ffffff" strokeWidth="2" />
      <rect x="76" y="140" width="140" height="4" fill="#11645f" />
      <rect x="216" y="140" width="108" height="4" fill="#11645f" />
      <rect x="314" y="134" width="10" height="6" rx="2" fill="#f2a541" />
      <rect x="70" y="128" width="8" height="10" rx="2" fill="#d9452b" />
      <path d="M300 156h28" stroke="#5d6662" strokeWidth="5" strokeLinecap="round" />
      {/* Naqla mark on the door */}
      <LogoMark x={228} y={124} width={40} />

      {/* wheels */}
      {[112, 280].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={158} r={15} fill="#1f2a28" />
          <circle cx={cx} cy={158} r={7} fill="#a9b3b0" />
        </g>
      ))}
    </svg>
  );
}
