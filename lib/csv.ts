/**
 * Build a CSV string with a UTF-8 BOM so Excel reads Arabic correctly.
 * Text cells that start like a formula (= + - @ tab CR) are prefixed with ' so a spreadsheet
 * shows them as text instead of running them (CSV formula injection). Plain numbers are untouched.
 */
const NUMERIC = /^-?\d+(\.\d+)?$/;
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(v: string | number | null | undefined): string {
  let s = String(v ?? "");
  if (typeof v !== "number" && FORMULA_START.test(s) && !NUMERIC.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number)[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
