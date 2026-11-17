// Korean lunar calendar <-> day number, using the generated table in korean-lunar-table.ts.
import { KOREAN_LUNAR_TABLE } from './korean-lunar-table';

const DAY = 86_400_000;
type Month = { startDay: number; days: number; year: number; month: number; leap: boolean };

const MONTHS: Month[] = (() => {
  const out: Month[] = [];
  for (const line of KOREAN_LUNAR_TABLE) {
    const [y, d, first, leap, bits] = line.split('|');
    let day = Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8)) / DAY;
    let num = +first;
    let usedLeap = false;
    for (let i = 0; i < bits.length; i++) {

      let isLeap = false;
      if (i > 0) {
        if (+leap !== 0 && num === +leap && !usedLeap) isLeap = usedLeap = true;
        else num = (num % 12) + 1;
      }
      const days = bits[i] === '1' ? 30 : 29;
      out.push({ startDay: day, days, year: +y, month: num, leap: isLeap });
      day += days;
    }
  }
  return out;
})();

export const KOREAN_LUNAR_RANGE = { firstDay: MONTHS[0].startDay, endDay: MONTHS[MONTHS.length - 1].startDay + MONTHS[MONTHS.length - 1].days };

export type LunarDate = { year: number; month: number; day: number; isLeapMonth: boolean };

export function dayToKoreanLunar(dayNumber: number): LunarDate | null {
  let lo = 0;
  let hi = MONTHS.length - 1;
  if (dayNumber < MONTHS[0].startDay || dayNumber >= KOREAN_LUNAR_RANGE.endDay) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (MONTHS[mid].startDay <= dayNumber) lo = mid;
    else hi = mid - 1;
  }
  const m = MONTHS[lo];
  return { year: m.year, month: m.month, day: dayNumber - m.startDay + 1, isLeapMonth: m.leap };
}

export type KoreanLunarError = 'OUT_OF_TABLE' | 'NO_SUCH_MONTH' | 'DAY_OUT_OF_MONTH';

export function koreanLunarToDay(year: number, month: number, day: number, isLeap: boolean): { day: number } | { error: KoreanLunarError } {
  const m = MONTHS.find((x) => x.year === year && x.month === month && x.leap === isLeap);
  if (!m) {

    const key = (y: number, mo: number) => y * 100 + mo;
    const first = MONTHS[0];
    const last = MONTHS[MONTHS.length - 1];
    if (key(year, month) < key(first.year, first.month) || key(year, month) > key(last.year, last.month)) return { error: 'OUT_OF_TABLE' };
    return { error: 'NO_SUCH_MONTH' };
  }
  if (day < 1 || day > m.days) return { error: 'DAY_OUT_OF_MONTH' };
  return { day: m.startDay + day - 1 };
}

export const koreanLunarMonths = (): readonly Month[] => MONTHS;
