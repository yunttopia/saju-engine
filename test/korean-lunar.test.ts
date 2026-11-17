import * as Astronomy from 'astronomy-engine';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { describe, expect, it } from 'vitest';
import { dayToKoreanLunar, koreanLunarMonths, koreanLunarToDay } from '../src/korean-lunar';
import { buildMonths, DAY, type Source } from '../src/tools/korean-lunar-core';

const aeSource: Source = {
  newMoonsUT(fromMs, toMs) {
    const out: number[] = [];
    let t = new Date(fromMs);
    for (;;) {
      const r = Astronomy.SearchMoonPhase(0, t, 40);
      if (!r) throw new Error('moon phase search failed');
      const ms = r.date.getTime();
      if (ms > toMs) break;
      out.push(ms);
      t = new Date(ms + DAY);
    }
    return out;
  },
  principalTermsUT(fromMs, toMs) {
    const out: { ms: number; lon: number }[] = [];
    let t = new Date(fromMs);
    let lon = (Math.ceil(Astronomy.SunPosition(t).elon / 30) * 30) % 360;
    for (;;) {
      const r = Astronomy.SearchSunLongitude(lon, t, 40);
      if (!r) throw new Error('sun longitude search failed');
      const ms = r.date.getTime();
      if (ms > toMs) break;
      out.push({ ms, lon });
      t = new Date(ms + DAY);
      lon = (lon + 30) % 360;
    }
    return out;
  },
};

const months = koreanLunarMonths();
const FIRST = Date.UTC(1900, 0, 1) / DAY;
const LAST = Date.UTC(2099, 11, 31) / DAY;
const key = (s: number, y: number, m: number, l: boolean, len: number) => `${new Date(s * DAY).toISOString().slice(0, 10)} ${y}-${m}${l ? 'L' : ''} ${len}`;

describe('built-in Korean lunar table', () => {
  it('covers solar 1900-01-01 to 2099-12-31 with 2474 months', () => {
    expect(months[0].startDay).toBeLessThanOrEqual(FIRST);
    const last = months[months.length - 1];
    expect(last.startDay + last.days).toBeGreaterThan(LAST);
    expect(months.length).toBe(2474);
  });

  it('matches an independent astronomy-engine computation for every month 1900-2099', () => {
    const ae = buildMonths(aeSource, 1899, 2100).filter((m) => m.endDay > FIRST && m.startDay <= LAST);
    const a = ae.map((m) => key(m.startDay, m.year, m.month, m.leap, m.endDay - m.startDay));
    const b = months.map((m) => key(m.startDay, m.year, m.month, m.leap, m.days));
    expect(a.length).toBe(b.length);
    const diff = a.filter((x, i) => x !== b[i]);
    expect(diff).toEqual([]);
  }, 120_000);

  it('matches korean-lunar-calendar (KASI data) every day 1900-01-31 to 2050-12-31', () => {
    const c = new KoreanLunarCalendar();
    const bad: string[] = [];
    let n = 0;
    for (let d = Date.UTC(1900, 0, 31) / DAY; d <= Date.UTC(2050, 11, 31) / DAY; d++) {
      const dt = new Date(d * DAY);
      if (!c.setSolarDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())) throw new Error('kasi range');
      const k = c.getLunarCalendar();
      const mine = dayToKoreanLunar(d)!;
      n++;
      if (k.year !== mine.year || k.month !== mine.month || k.day !== mine.day || !!k.intercalation !== mine.isLeapMonth) bad.push(dt.toISOString().slice(0, 10));
    }
    expect(n).toBe(55_122);
    expect(bad).toEqual([]);
  });

  it('round trip: every lunar date -> solar -> lunar', () => {
    let bad = 0;
    for (const m of months) {
      for (let d = 1; d <= m.days; d++) {
        const r = koreanLunarToDay(m.year, m.month, d, m.leap);
        if ('error' in r) { bad++; continue; }
        const back = dayToKoreanLunar(r.day)!;
        if (back.year !== m.year || back.month !== m.month || back.day !== d || back.isLeapMonth !== m.leap) bad++;
      }
    }
    expect(bad).toBe(0);
  });

  it('sample Korean lunar dates (1987)', () => {
    expect(dayToKoreanLunar(Date.UTC(1987, 5, 10) / DAY)).toEqual({ year: 1987, month: 5, day: 14, isLeapMonth: false });
    expect(dayToKoreanLunar(Date.UTC(1987, 5, 6) / DAY)).toEqual({ year: 1987, month: 5, day: 10, isLeapMonth: false });
    expect(koreanLunarToDay(1987, 5, 1, false)).toEqual({ day: Date.UTC(1987, 4, 28) / DAY });
  });

  it('errors: missing leap month / day beyond month / out of range', () => {
    expect(koreanLunarToDay(2023, 3, 1, true)).toEqual({ error: 'NO_SUCH_MONTH' });
    expect(koreanLunarToDay(2023, 1, 30, false)).toEqual({ error: 'DAY_OUT_OF_MONTH' });
    expect(koreanLunarToDay(1899, 11, 1, false)).toEqual({ error: 'OUT_OF_TABLE' });
    expect(koreanLunarToDay(2099, 12, 1, false)).toEqual({ error: 'OUT_OF_TABLE' });
  });
});
