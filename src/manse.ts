// Four-pillar calculation: clock time -> UTC -> solar-time correction (UTC+8:30 reference) -> year/month/day/hour pillars, solar terms and luck cycles.
import { calcDaeun } from './daeun';
import { lunarToSolar, solarToLunar } from './calendar';
import { mod, pillarFromParts, pillarOf } from './ganzhi';
import { ipchun, prevNext, toJeolip } from './jeolip';
import { DAY, daysInMonth, fmtMinute, fmtSecond, fmtUtc, HOUR, naiveMs, parts } from './naive';
import { clockToUtc } from './tz';
import type { ManseError, ManseInput, ManseResult, TimeInfo, Warning } from './types';

export const SPEC_VERSION = 'manse-v1' as const;
const CORRECTED_OFFSET_SEC = 8 * 3600 + 30 * 60; // solar-time reference: UTC+8:30 (about 127.5E, Seoul)
const RANGE_MIN = naiveMs(1900, 1, 1);
const RANGE_MAX = naiveMs(2100, 1, 1);

function fail(code: ManseError['error']['code'], message: string, detail?: ManseError['error']['detail']): ManseError {
  return detail ? { ok: false, error: { code, detail, message } } : { ok: false, error: { code, message } };
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

export function yearMonthPillars(clockMs: number) {
  const { prev, next } = prevNext(clockMs);
  const y = parts(clockMs).year;
  const solarYear = clockMs < ipchun(y).ms ? y - 1 : y;
  const year = pillarOf(solarYear - 4);
  const k = mod(prev.branchIndex - 2, 12);
  const month = pillarFromParts(mod(2 * year.stemIndex + 2 + k, 10), prev.branchIndex);
  return { solarYear, year, month, prev, next };
}

export function dayPillarOfDate(dateMs: number) {
  const jdn = Math.floor(dateMs / DAY) + 2440588;
  return pillarOf(jdn + 49);
}

export function calcManse(input: ManseInput): ManseResult | ManseError {

  if (!input || (input.calendar !== 'solar' && input.calendar !== 'lunar')) return fail('INVALID_INPUT', 'calendar');
  if (input.sex !== 'M' && input.sex !== 'F') return fail('INVALID_INPUT', 'sex');
  const { year, month, day } = input;
  if (!isInt(year) || !isInt(month) || !isInt(day)) return fail('INVALID_INPUT', 'date must be integers');
  if (input.isLeapMonth !== undefined && typeof input.isLeapMonth !== 'boolean') return fail('INVALID_INPUT', 'isLeapMonth');
  if (input.time !== null) {
    if (typeof input.time !== 'object' || !isInt(input.time.hour) || !isInt(input.time.minute)) return fail('INVALID_INPUT', 'time');
    if (input.time.hour < 0 || input.time.hour > 23 || input.time.minute < 0 || input.time.minute > 59) return fail('INVALID_INPUT', 'time range');
  }
  if (month < 1 || month > 12) return fail('INVALID_INPUT', 'month range');
  if (year < 1899 || year > 2100) return fail('OUT_OF_RANGE', 'year');

  let sy: number, sm: number, sd: number;
  if (input.calendar === 'solar') {
    if (day < 1 || day > daysInMonth(year, month)) return fail('INVALID_INPUT', 'day range');
    if (input.isLeapMonth) return fail('INVALID_INPUT', 'isLeapMonth with solar');
    [sy, sm, sd] = [year, month, day];
  } else {
    if (day < 1 || day > 30) return fail('INVALID_INPUT', 'lunar day range 1~30');
    const s = lunarToSolar(year, month, day, input.isLeapMonth === true);
    if ('error' in s) {
      if (s.error === 'OUT_OF_TABLE') return fail('OUT_OF_RANGE', 'lunar date outside supported range');
      return fail('INVALID_LUNAR_DATE', s.error === 'NO_SUCH_MONTH' ? 'no such (leap) month' : 'day exceeds month length', s.error);
    }
    [sy, sm, sd] = [s.year, s.month, s.day];
  }
  const dateMs = naiveMs(sy, sm, sd);
  if (dateMs < RANGE_MIN || dateMs >= RANGE_MAX) return fail('OUT_OF_RANGE', 'supported 1900-01-01 ~ 2099-12-31');

  const known = input.time !== null;
  const clockMs = known ? naiveMs(sy, sm, sd, input.time!.hour, input.time!.minute) : naiveMs(sy, sm, sd, 12, 0);
  const warnings: Warning[] = [];

  const conv = clockToUtc(clockMs);
  if (conv.kind === 'nonexistent') warnings.push('NONEXISTENT_LOCAL_TIME');
  if (conv.kind === 'ambiguous') warnings.push('AMBIGUOUS_LOCAL_TIME');
  const correctedMs = conv.utcMs + CORRECTED_OFFSET_SEC * 1000;
  const longitudeCorrectionSec = CORRECTED_OFFSET_SEC - conv.offset.standardSec;
  const time: TimeInfo = {
    clock: fmtMinute(clockMs),
    utc: fmtUtc(conv.utcMs),
    corrected: fmtSecond(correctedMs),
    standardOffsetMin: conv.offset.standardSec / 60,
    standardOffsetSec: conv.offset.standardSec,
    dstMin: conv.offset.dstMin,
    longitudeCorrectionMin: longitudeCorrectionSec / 60,
    longitudeCorrectionSec,
    dstCorrectionMin: conv.offset.dstMin === 60 ? -60 : 0,
    totalCorrectionMin: (correctedMs - clockMs) / 60_000,
    totalCorrectionSec: Math.round((correctedMs - clockMs) / 1000),
  };

  const ym = yearMonthPillars(clockMs);

  let dayP, hourP = null;
  if (known) {
    const shifted = correctedMs + HOUR;
    const shiftedDate = Math.floor(shifted / DAY) * DAY;
    dayP = dayPillarOfDate(shiftedDate);
    const branch = Math.floor((shifted - shiftedDate) / (2 * HOUR));
    hourP = pillarFromParts(mod(2 * dayP.stemIndex + branch, 10), branch);
  } else {
    dayP = dayPillarOfDate(dateMs);
    const { prev, next } = prevNext(clockMs);
    if ((prev.ms >= dateMs && prev.ms < dateMs + DAY) || (next.ms >= dateMs && next.ms < dateMs + DAY)) {
      warnings.push('JEOLIP_DAY_TIME_UNKNOWN');
    }
  }

  const daeun = calcDaeun(clockMs, ym.year.stemIndex, input.sex, ym.month, ym.prev, ym.next);

  return {
    ok: true,
    specVersion: SPEC_VERSION,
    input,
    solar: { year: sy, month: sm, day: sd, hour: known ? input.time!.hour : null, minute: known ? input.time!.minute : null },
    lunar: solarToLunar(sy, sm, sd),
    time,
    pillars: { year: ym.year, month: ym.month, day: dayP, hour: hourP },
    solarYear: ym.solarYear,
    jeolip: { prev: toJeolip(ym.prev), next: toJeolip(ym.next) },
    daeun,
    warnings: [...warnings].sort(),
  };
}
