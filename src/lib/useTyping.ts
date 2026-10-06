"use client";
import { useEffect, useState } from "react";

/** Fields that open the on-screen keyboard (pickers like date/select don't). */
function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA") return true;
  if (el.tagName !== "INPUT") return false;
  const type = (el as HTMLInputElement).type;
  return !["date", "time", "checkbox", "radio", "hidden", "file", "range", "button", "submit", "color"].includes(type);
}

/**
 * True while the user is typing in a text field (i.e. the phone keyboard is up).
 * Fixed bottom bars use it to slide away so they never sit on top of the field
 * being typed in. A short delay on blur avoids flicker when hopping between fields.
 */
export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onIn = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      clearTimeout(t);
      setTyping(true);
    };
    const onOut = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      clearTimeout(t);
      t = setTimeout(() => setTyping(isTextField(document.activeElement)), 150);
    };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      clearTimeout(t);
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return typing;
}
