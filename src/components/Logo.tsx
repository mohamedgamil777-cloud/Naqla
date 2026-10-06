/** Official Naqla logo — cut from the brand board (public/brand/*.png).
 *  `logo.png` = teal lockup (نقلة + NAQLA + truck), `logo-white.png` = for dark surfaces,
 *  `mark.png` = the truck on its own. */

const LOGO_W = 716;
const LOGO_H = 215;
const MARK_W = 337;
const MARK_H = 184;

export function Logo({
  className = "h-10",
  surface = "light",
}: {
  className?: string;
  /** dark = white version (admin sidebar); light / bar = teal version */
  surface?: "light" | "bar" | "dark";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={surface === "dark" ? "/brand/logo-white.png" : "/brand/logo.png"}
      alt="نقلة"
      width={LOGO_W}
      height={LOGO_H}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}

/** The truck mark alone. Pass x/y/width to place it inside another <svg>. */
export function LogoMark({ className = "h-8", x, y, width }: { className?: string; x?: number; y?: number; width?: number }) {
  if (width != null) {
    return <image href="/brand/mark.png" x={x} y={y} width={width} height={(width * MARK_H) / MARK_W} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/mark.png" alt="" aria-hidden="true" width={MARK_W} height={MARK_H} className={`h-auto select-none ${className}`} draggable={false} />
  );
}
