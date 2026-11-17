// Solar <-> Korean lunar date conversion (built-in table only).
import { dayToKoreanLunar, koreanLunarToDay, type KoreanLunarError } from './korean-lunar';

const DAY = 86_400_000;
export type YMD = { year: number; month: number; day: number };

const toYmd = (dayNumber: number): YMD => {
  const d = new Date(dayNumber * DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

export function lunarToSolar(year: number, month: number, day: number, isLeap: boolean): YMD | { error: KoreanLunarError } {
  const r = koreanLunarToDay(year, month, day, isLeap);
  return 'error' in r ? r : toYmd(r.day);
}

export function solarToLunar(year: number, month: number, day: number) {
  const l = dayToKoreanLunar(Date.UTC(year, month - 1, day) / DAY);
  if (!l) throw new Error('solar date outside Korean lunar table');
  return l;
}
