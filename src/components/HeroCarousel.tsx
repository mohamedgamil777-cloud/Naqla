"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Home carousel: swipeable (CSS scroll-snap), auto-advances every 5s, pauses while touched,
 * dots to jump. The scroller is LTR so the math is simple; the page around it stays RTL.
 */
export function HeroCarousel({ slides, alt = "انقلي" }: { slides: string[]; alt?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const count = slides.length;

  // keep the dots in sync with manual swipes
  function onScroll() {
    const el = ref.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function go(i: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    if (count < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => {
      if (paused.current || document.hidden) return;
      const el = ref.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 5000);
    return () => clearInterval(t);
  }, [count]);

  return (
    <div className="relative">
      <div
        ref={ref}
        dir="ltr"
        onScroll={onScroll}
        onPointerDown={() => (paused.current = true)}
        onPointerUp={() => setTimeout(() => (paused.current = false), 4000)}
        onTouchStart={() => (paused.current = true)}
        onTouchEnd={() => setTimeout(() => (paused.current = false), 4000)}
        className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
      >
        {slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={count > 1 ? `${alt} — صورة ${i + 1} من ${count}` : alt}
            loading={i === 0 ? "eager" : "lazy"}
            draggable={false}
            className="block w-full shrink-0 snap-center aspect-[36/19] object-cover select-none"
          />
        ))}
      </div>
      {count > 1 && (
        <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5" dir="ltr">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`صورة ${i + 1}`}
              aria-current={i === index || undefined}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/60"} shadow`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
