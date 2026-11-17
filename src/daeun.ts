// Ten-year luck cycles (daeun): direction by year-stem polarity and sex; start age = minutes to the adjacent jeol / 4320 (3 days = 1 year), rounded half up, minimum 1.
import { pillarOf, type Pillar } from './ganzhi';
import type { JieTime } from './jeolip';
import type { DaeunEntry } from './types';

export const DAEUN_COUNT = 11;
const MINUTES_PER_YEAR = 4320;

export function calcDaeun(clockMs: number, yearStemIndex: number, sex: 'M' | 'F', month: Pillar, prev: JieTime, next: JieTime) {
  const yang = yearStemIndex % 2 === 0;
  const forward = yang === (sex === 'M');
  const ref = forward ? next : prev;
  const startMinutes = Math.abs(ref.ms - clockMs) / 60_000;
  const startYearsExact = startMinutes / MINUTES_PER_YEAR;
  const daeunsu = Math.max(1, Math.floor(startYearsExact + 0.5));
  const list: DaeunEntry[] = [];
  for (let k = 1; k <= DAEUN_COUNT; k++) {
    list.push({ order: k, age: daeunsu + 10 * (k - 1), pillar: pillarOf(month.index + (forward ? k : -k)) });
  }
  return {
    direction: forward ? ('forward' as const) : ('backward' as const),
    startMinutes,
    startYearsExact,
    startMonthsTotal: startYearsExact * 12,
    daeunsu,
    list,
  };
}
