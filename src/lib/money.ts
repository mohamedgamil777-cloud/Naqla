/**
 * Money is stored and computed in integer PIASTRES (1 EGP = 100 piastres).
 * Never use floats for money. All engine math happens in piastres; we only
 * format to EGP at the very edge (display).
 */

export type Piastres = number;

export function egpToPiastres(egp: number): Piastres {
  return Math.round(egp * 100);
}

export function piastresToEgp(p: Piastres): number {
  return p / 100;
}

/** Format piastres as a readable EGP string, e.g. 105000 -> "1,050 جنيه". */
export function formatEgp(p: Piastres, opts?: { withUnit?: boolean }): string {
  const egp = piastresToEgp(p);
  // Show decimals only when there are piastres.
  const hasFraction = p % 100 !== 0;
  const num = egp.toLocaleString("en-EG", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return opts?.withUnit === false ? num : `${num} جنيه`;
}

/** Format piastres as a compact number without the unit (for tables). */
export function formatNumber(p: Piastres): string {
  return formatEgp(p, { withUnit: false });
}
