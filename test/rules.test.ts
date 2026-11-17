import { describe, expect, it } from 'vitest';
import { calcManse, koreanAge, seun, wolun, type ManseInput, type ManseResult } from '../src/index';
import { jieInMonth } from '../src/jeolip';
import { clockToUtc, offsetAtUtc } from '../src/tz';
import { naiveMs } from '../src/naive';

const S = (y: number, m: number, d: number, h: number, mi: number, sex: 'M' | 'F' = 'M'): ManseInput => ({ calendar: 'solar', year: y, month: m, day: d, time: { hour: h, minute: mi }, sex });
const ok = (i: ManseInput) => {
  const r = calcManse(i);
  if (!r.ok) throw new Error(r.error.code);
  return r as ManseResult;
};
const dh = (r: ManseResult) => `${r.pillars.day.ganzhi} ${r.pillars.hour?.ganzhi}`;

describe('nonexistent local time maps after the change, repeated time maps before it', () => {
  const dec = (r: ManseResult) => [r.time.longitudeCorrectionMin, r.time.dstCorrectionMin, r.time.totalCorrectionSec];
  it('1987-05-10 02:30 -> +10:00, corrected 01:00, day 己未 hour 乙丑, longitude -30, DST -60', () => {
    const r = ok(S(1987, 5, 10, 2, 30));
    expect(r.warnings).toEqual(['NONEXISTENT_LOCAL_TIME']);
    expect(r.time.corrected).toBe('1987-05-10T01:00:00');
    expect(dec(r)).toEqual([-30, -60, -5400]);
    expect(dh(r)).toBe('己未 乙丑');
  });
  it('1987-05-10 02:10 -> corrected 00:40, day 己未 hour 甲子', () => {
    const r = ok(S(1987, 5, 10, 2, 10));
    expect(r.time.corrected).toBe('1987-05-10T00:40:00');
    expect(dh(r)).toBe('己未 甲子');
    expect(dec(r)).toEqual([-30, -60, -5400]);
  });
  it('1987-05-10 02:00 does not exist (DST side), 03:00 DST, 01:59 standard', () => {
    const r = ok(S(1987, 5, 10, 2, 0));
    expect([r.warnings, r.time.dstMin]).toEqual([['NONEXISTENT_LOCAL_TIME'], 60]);
    expect(ok(S(1987, 5, 10, 3, 0)).warnings).toEqual([]);
    expect(ok(S(1987, 5, 10, 3, 0)).time.dstMin).toBe(60);
    expect(ok(S(1987, 5, 10, 1, 59)).time.dstMin).toBe(0);
  });
  it('1987-10-11 02:30 -> earlier (+10:00), corrected 01:00, day 癸巳 hour 癸丑', () => {
    const r = ok(S(1987, 10, 11, 2, 30));
    expect(r.warnings).toEqual(['AMBIGUOUS_LOCAL_TIME']);
    expect(dec(r)).toEqual([-30, -60, -5400]);
    expect(dh(r)).toBe('癸巳 癸丑');
  });
  it('1987-10-11 02:00 occurs twice, 03:00 once (+9:00), 01:59 DST', () => {
    expect(ok(S(1987, 10, 11, 2, 0)).warnings).toEqual(['AMBIGUOUS_LOCAL_TIME']);
    const r3 = ok(S(1987, 10, 11, 3, 0));
    expect([r3.warnings, r3.time.totalCorrectionSec]).toEqual([[], -1800]);
    expect(ok(S(1987, 10, 11, 1, 59)).time.totalCorrectionSec).toBe(-5400);
  });
  it('1961-08-10 00:15 -> +9:00, longitude -30, corrected 1961-08-09 23:45, day 乙亥 hour 丙子', () => {
    const r = ok(S(1961, 8, 10, 0, 15));
    expect(r.warnings).toEqual(['NONEXISTENT_LOCAL_TIME']);
    expect(dec(r)).toEqual([-30, 0, -1800]);
    expect(r.time.corrected).toBe('1961-08-09T23:45:00');
    expect(dh(r)).toBe('乙亥 丙子');
  });
  it('1954-03-20 23:45 occurs twice -> +9:00 side', () => {
    const r = ok(S(1954, 3, 20, 23, 45));
    expect(r.warnings).toEqual(['AMBIGUOUS_LOCAL_TIME']);
    expect(r.time.longitudeCorrectionMin).toBe(-30);
  });
  it('1960-09-17 23:30 occurs twice at DST end -> DST side', () => {
    const r = ok(S(1960, 9, 17, 23, 30));
    expect(r.warnings).toEqual(['AMBIGUOUS_LOCAL_TIME']);
    expect(r.time.dstMin).toBe(60);
  });
  it('1948-06-01 00:30 does not exist -> DST side', () => {
    const r = ok(S(1948, 6, 1, 0, 30));
    expect([r.warnings, r.time.dstMin, r.time.corrected]).toEqual([['NONEXISTENT_LOCAL_TIME'], 60, '1948-05-31T23:00:00']);
  });
});

describe('before 1908-04-01 treated as UTC+9; 1908-1911 is +8:30', () => {
  it('1905-05-04 12:00 -> longitude -30, DST 0', () => {
    const r = ok(S(1905, 5, 4, 12, 0));
    expect([r.time.longitudeCorrectionMin, r.time.dstCorrectionMin, r.time.standardOffsetSec]).toEqual([-30, 0, 32400]);
    expect(r.time.corrected).toBe('1905-05-04T11:30:00');
  });
  it('1905-05-04 23:10 -> day 癸卯 hour 癸亥', () => {
    expect(dh(ok(S(1905, 5, 4, 23, 10)))).toBe('癸卯 癸亥');
  });
  it('1910-06-15 13:10 -> day 辛亥 hour 乙未, longitude 0', () => {
    const r = ok(S(1910, 6, 15, 13, 10));
    expect(dh(r)).toBe('辛亥 乙未');
    expect([r.time.longitudeCorrectionMin, r.time.dstCorrectionMin]).toEqual([0, 0]);
  });
  it('1910-06-15 23:10 -> day 壬子 hour 庚子', () => {
    expect(dh(ok(S(1910, 6, 15, 23, 10)))).toBe('壬子 庚子');
  });
  it('1908-03-31 23:30-23:59 occurs twice -> before the change (+9:00)', () => {
    const r = ok(S(1908, 3, 31, 23, 45));
    expect([r.warnings, r.time.longitudeCorrectionMin, r.time.corrected]).toEqual([['AMBIGUOUS_LOCAL_TIME'], -30, '1908-03-31T23:15:00']);
    expect(ok(S(1908, 3, 31, 23, 29)).warnings).toEqual([]);
    expect(ok(S(1908, 4, 1, 0, 0)).time.longitudeCorrectionMin).toBe(0);
  });
  it('1912-01-01 00:00-00:29 does not exist -> after the change (+9:00)', () => {
    const r = ok(S(1912, 1, 1, 0, 15));
    expect([r.warnings, r.time.longitudeCorrectionMin, r.time.corrected]).toEqual([['NONEXISTENT_LOCAL_TIME'], -30, '1911-12-31T23:45:00']);
    expect(ok(S(1911, 12, 31, 23, 59)).time.longitudeCorrectionMin).toBe(0);
  });
});

describe('time zone table vs Node Intl (1900-2099 every 3 hours; +9 before 1908-04-01)', () => {
  it('total offset per UTC instant', () => {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    const intlOffset = (u: number) => {
      const p = Object.fromEntries(fmt.formatToParts(new Date(u)).map((x) => [x.type, x.value]));
      return Math.round((naiveMs(+p.year, +p.month, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(u / 1000) * 1000) / 1000);
    };
    const bad: string[] = [];
    for (let u = Date.UTC(1900, 0, 1); u < Date.UTC(2100, 0, 1); u += 3 * 3_600_000) {
      const o = offsetAtUtc(u);
      const mine = o.standardSec + o.dstMin * 60;

      if (u >= Date.UTC(1908, 2, 31, 15, 0) && u < Date.UTC(1908, 2, 31, 15, 33)) continue;
      const want = u < Date.UTC(1908, 2, 31, 15, 0) ? 32400 : intlOffset(u);
      if (mine !== want) bad.push(new Date(u).toISOString());
      if (bad.length > 5) break;
    }
    expect(bad).toEqual([]);
  }, 30_000);
  it('clockToUtc for ordinary times', () => {
    const c = clockToUtc(naiveMs(1958, 7, 1, 12, 0));
    expect(c.kind).toBe('normal');
    expect(c.offset).toEqual({ standardSec: 30600, dstMin: 60 });
  });
});

describe('solar term (jeol) boundaries', () => {
  it('1958-05-06 09:30 month 丙辰 / 10:10 month 丁巳', () => {
    expect(ok(S(1958, 5, 6, 9, 30)).pillars.month.ganzhi).toBe('丙辰');
    expect(ok(S(1958, 5, 6, 10, 10)).pillars.month.ganzhi).toBe('丁巳');
  });
  it('one minute before and after 立春 (1995, 16:12:51.190)', () => {
    expect(ok(S(1995, 2, 4, 16, 12)).pillars.year.ganzhi).toBe('甲戌');
    expect(ok(S(1995, 2, 4, 16, 13)).pillars.year.ganzhi).toBe('乙亥');
    expect(ok(S(1995, 2, 4, 16, 13)).solarYear).toBe(1995);
    expect(ok(S(1995, 2, 4, 16, 12)).solarYear).toBe(1994);
  });
  it('January after 小寒 is the 丑 month of the previous solar-term year', () => {
    const r = ok(S(2027, 1, 20, 12, 0));
    expect([r.solarYear, r.pillars.year.ganzhi, r.pillars.month.ganzhi]).toEqual([2026, '丙午', '辛丑']);
  });
});

describe('day and hour pillar boundaries', () => {
  it('1990-06-15 13:30 -> hour 乙未', () => {
    expect(ok(S(1990, 6, 15, 13, 30)).pillars.hour!.ganzhi).toBe('乙未');
  });
  it('1985-08-20 23:30 -> day 壬辰 hour 庚子 / 23:29 -> day 辛卯 hour 己亥', () => {
    expect(dh(ok(S(1985, 8, 20, 23, 30)))).toBe('壬辰 庚子');
    expect(dh(ok(S(1985, 8, 20, 23, 29)))).toBe('辛卯 己亥');
  });
  it('with zero correction (1958, no DST) the next day starts at clock 23:00', () => {
    const a = ok(S(1958, 3, 1, 22, 59));
    const b = ok(S(1958, 3, 1, 23, 0));
    expect(a.pillars.hour!.branch).toBe('亥');
    expect(b.pillars.hour!.branch).toBe('子');
    expect(b.pillars.day.index).toBe((a.pillars.day.index + 1) % 60);
  });
  it('during DST clock 00:29 is the previous day 亥 hour, 00:30 is 子 hour', () => {
    expect(ok(S(1987, 7, 1, 0, 29)).pillars.hour!.branch).toBe('亥');
    const r = ok(S(1987, 7, 1, 0, 30));
    expect(r.pillars.hour!.branch).toBe('子');
    expect(r.pillars.day.index).toBe(ok(S(1987, 7, 1, 12, 0)).pillars.day.index);
  });
});

describe('daeun start age', () => {
  it('1990-07-03 05:40 -> 2, 06:20 -> 1', () => {
    const a = ok(S(1990, 7, 3, 5, 40));
    const b = ok(S(1990, 7, 3, 6, 20));
    expect([a.daeun.daeunsu, b.daeun.daeunsu]).toEqual([2, 1]);
    expect(a.daeun.startYearsExact).toBeGreaterThan(1.5);
    expect(b.daeun.startYearsExact).toBeLessThan(1.5);
  });
  it('exactly .5 rounds up', () => {

    expect(Math.max(1, Math.floor(1.5 + 0.5))).toBe(2);
  });
  it('exact start years', () => {
    const v = (i: ManseInput) => Number(ok(i).daeun.startYearsExact.toFixed(3));
    expect(v(S(1990, 6, 15, 12, 0))).toBe(7.417);
    expect(v(S(1990, 6, 15, 12, 0, 'F'))).toBe(3.059);
    expect(v(S(1990, 7, 15, 12, 0))).toBe(7.886);
    expect(v(S(2000, 5, 6, 12, 0))).toBe(10.083);
    expect(v(S(2000, 5, 7, 12, 0))).toBe(9.75);
  });
});

describe('yearly and monthly pillars', () => {
  it('every solar month 1900-2099 has exactly one jeol', () => {
    let n = 0;
    for (let y = 1900; y <= 2099; y++) for (let m = 1; m <= 12; m++) { jieInMonth(y, m); n++; }
    expect(n).toBe(2400);
  });
  it('koreanAge', () => {
    expect(koreanAge(2026, 1990)).toBe(37);
    expect(koreanAge(2026, 1995)).toBe(32);
  });
  it('seun and wolun reject non-integer or out-of-range years', () => {
    for (const y of [1899, 2100, 1990.5, NaN]) expect(() => wolun(y)).toThrow(RangeError);
    expect(wolun(1900)).toHaveLength(12);
    expect(wolun(2099)).toHaveLength(12);
    expect(() => seun(2026, 1899)).toThrow(RangeError);
    expect(() => seun(2026.5, 1990)).toThrow(RangeError);
    expect(() => seun(2201, 1990)).toThrow(RangeError);
    expect(seun(2200, 2099).age).toBe(102);
  });
  it('yearly pillars 2026-2032', () => {
    expect([2026, 2027, 2028, 2029, 2030, 2031, 2032].map((y) => seun(y, 1990).pillar.ganzhi).join(' ')).toBe('丙午 丁未 戊申 己酉 庚戌 辛亥 壬子');
  });
  it('yearly age is counted by solar year', () => {
    expect(seun(2026, 1995).age).toBe(32);
    expect(seun(2026, 1988).age).toBe(39);
  });
  it('monthly pillars June-December 2026', () => {
    expect(wolun(2026).slice(5).map((w) => `${w.month}${w.pillar.ganzhi}`).join(' ')).toBe('6甲午 7乙未 8丙申 9丁酉 10戊戌 11己亥 12庚子');
    expect(wolun(2027)[0].pillar.ganzhi).toBe('辛丑');
    expect(wolun(2026)[9].jeolip.name).toBe('寒露');
  });
});

describe('input validation and unknown birth time', () => {
  it('unknown time: computed at 12:00', () => {
    const r = ok({ calendar: 'solar', year: 1990, month: 6, day: 15, time: null, sex: 'M' });
    expect([r.time.clock, r.time.corrected, r.time.totalCorrectionSec]).toEqual(['1990-06-15T12:00', '1990-06-15T11:30:00', -1800]);
  });
  it('unknown time: no hour pillar, day pillar from the input date', () => {
    const r = ok({ calendar: 'solar', year: 1990, month: 6, day: 15, time: null, sex: 'M' });
    expect(r.pillars.hour).toBeNull();
    expect(r.pillars.day.ganzhi).toBe('辛亥');
    expect(r.time.clock).toBe('1990-06-15T12:00');
    expect(r.solar.hour).toBeNull();
    expect(r.warnings).toEqual([]);
  });
  it('unknown time on a jeol day -> JEOLIP_DAY_TIME_UNKNOWN', () => {
    const r = ok({ calendar: 'solar', year: 1995, month: 2, day: 4, time: null, sex: 'M' });
    expect(r.warnings).toEqual(['JEOLIP_DAY_TIME_UNKNOWN']);
    const r2 = ok({ calendar: 'solar', year: 1990, month: 6, day: 6, time: null, sex: 'M' });
    expect(r2.warnings).toEqual(['JEOLIP_DAY_TIME_UNKNOWN']);
  });
  it('unknown time near midnight does not shift the day', () => {
    const r = ok({ calendar: 'solar', year: 1985, month: 8, day: 20, time: null, sex: 'M' });
    expect(r.pillars.day.ganzhi).toBe('辛卯');
  });
  it('lunar input errors', () => {
    const e = (i: any) => { const r = calcManse({ time: null, sex: 'M', calendar: 'lunar', ...i }); return r.ok ? 'OK' : `${r.error.code}${r.error.detail ? '/' + r.error.detail : ''}`; };
    expect(e({ year: 2023, month: 3, day: 1, isLeapMonth: true })).toBe('INVALID_LUNAR_DATE/NO_SUCH_MONTH');
    expect(e({ year: 2023, month: 1, day: 30 })).toBe('INVALID_LUNAR_DATE/DAY_OUT_OF_MONTH');
    expect(e({ year: 2023, month: 1, day: 31 })).toBe('INVALID_INPUT');
    expect(e({ year: 1899, month: 11, day: 1 })).toBe('OUT_OF_RANGE');
    expect(e({ year: 1899, month: 12, day: 1 })).toBe('OK');
    expect(e({ year: 2099, month: 12, day: 1 })).toBe('OUT_OF_RANGE');
    expect(e({ year: 2017, month: 5, day: 1, isLeapMonth: true })).toBe('OK');
  });
  it('lunar 1987-05-01 10:00 -> solar 1987-05-28 (Korean lunar calendar)', () => {
    const r = ok({ calendar: 'lunar', year: 1987, month: 5, day: 1, time: { hour: 10, minute: 0 }, sex: 'M' });
    expect(r.solar).toEqual({ year: 1987, month: 5, day: 28, hour: 10, minute: 0 });
    expect(dh(r)).toBe('丁丑 甲辰');
  });
  it('leap month and early-1900s lunar dates', () => {
    const r = ok({ calendar: 'lunar', year: 2017, month: 5, day: 1, isLeapMonth: true, time: { hour: 10, minute: 0 }, sex: 'M' });
    expect(r.solar).toEqual({ year: 2017, month: 6, day: 24, hour: 10, minute: 0 });
    expect(ok(S(1905, 5, 4, 12, 0)).lunar).toEqual({ year: 1905, month: 4, day: 1, isLeapMonth: false });
  });
  it('solar input with isLeapMonth:true -> INVALID_INPUT, false is allowed', () => {
    expect(calcManse({ ...S(1990, 6, 15, 12, 0), isLeapMonth: true }).ok).toBe(false);
    expect(calcManse({ ...S(1990, 6, 15, 12, 0), isLeapMonth: false }).ok).toBe(true);
  });
  it('input validation', () => {
    const code = (i: any) => { const r = calcManse(i); return r.ok ? 'OK' : r.error.code; };
    expect(code(S(1990, 2, 29, 12, 0))).toBe('INVALID_INPUT');
    expect(code(S(1990, 13, 1, 12, 0))).toBe('INVALID_INPUT');
    expect(code(S(1990, 1, 1, 24, 0))).toBe('INVALID_INPUT');
    expect(code(S(1990, 1, 1, 12, 60))).toBe('INVALID_INPUT');
    expect(code({ ...S(1990, 1, 1, 12, 0), sex: 'X' })).toBe('INVALID_INPUT');
    expect(code(S(1899, 12, 31, 12, 0))).toBe('OUT_OF_RANGE');
    expect(code(S(2100, 1, 1, 0, 0))).toBe('OUT_OF_RANGE');
    expect(code(S(1900, 1, 1, 0, 0))).toBe('OK');
    expect(code(S(2099, 12, 31, 23, 59))).toBe('OK');
  });
});
