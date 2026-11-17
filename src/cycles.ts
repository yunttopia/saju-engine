// Yearly (seun) and monthly (wolun) pillars and traditional Korean age.
import { pillarOf, type Pillar } from './ganzhi';
import { jieInMonth, toJeolip, type Jeolip } from './jeolip';
import { yearMonthPillars } from './manse';

export function koreanAge(asOfYear: number, birthSolarYear: number): number {
  return asOfYear - birthSolarYear + 1;
}

function checkYear(v: number, what: string, min: number, max: number): void {
  if (!Number.isInteger(v) || v < min || v > max) throw new RangeError(`${what} must be an integer in ${min}..${max}`);
}

/** Throws RangeError for non-integer or out-of-range years. */
export function seun(year: number, birthSolarYear: number): { year: number; age: number; pillar: Pillar } {
  checkYear(birthSolarYear, 'birthSolarYear', 1900, 2099);
  checkYear(year, 'year', 1900, 2200);
  return { year, age: koreanAge(year, birthSolarYear), pillar: pillarOf(year - 4) };
}

/** Throws RangeError for non-integer years or years outside 1900..2099. */
export function wolun(year: number): { month: number; jeolip: Jeolip; pillar: Pillar }[] {
  checkYear(year, 'year', 1900, 2099);
  const out = [];
  for (let m = 1; m <= 12; m++) {
    const j = jieInMonth(year, m);
    out.push({ month: m, jeolip: toJeolip(j), pillar: yearMonthPillars(j.ms).month });
  }
  return out;
}
