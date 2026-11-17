// Korean civil time history (standard offset and DST) as constants taken from tzdb 2026e Asia/Seoul. Before 1908-04-01 the engine uses UTC+9 by convention (tzdb has LMT +8:27:52).
import { HOUR, naiveMs } from './naive';

export const TZDB_VERSION = '2026e';

const H830 = 8 * 3600 + 30 * 60;
const H900 = 9 * 3600;

const STANDARD_CHANGES: [number, number][] = [
  [naiveMs(1908, 4, 1), H830],
  [naiveMs(1912, 1, 1), H900],
  [naiveMs(1954, 3, 21), H830],
  [naiveMs(1961, 8, 10), H900],
];

const DST_PERIODS: [number, number][] = [
  [naiveMs(1948, 6, 1), naiveMs(1948, 9, 13)],
  [naiveMs(1949, 4, 3), naiveMs(1949, 9, 11)],
  [naiveMs(1950, 4, 1), naiveMs(1950, 9, 10)],
  [naiveMs(1951, 5, 6), naiveMs(1951, 9, 9)],
  [naiveMs(1955, 5, 5), naiveMs(1955, 9, 9)],
  [naiveMs(1956, 5, 20), naiveMs(1956, 9, 30)],
  [naiveMs(1957, 5, 5), naiveMs(1957, 9, 22)],
  [naiveMs(1958, 5, 4), naiveMs(1958, 9, 21)],
  [naiveMs(1959, 5, 3), naiveMs(1959, 9, 20)],
  [naiveMs(1960, 5, 1), naiveMs(1960, 9, 18)],
  [naiveMs(1987, 5, 10, 2), naiveMs(1987, 10, 11, 3)],
  [naiveMs(1988, 5, 8, 2), naiveMs(1988, 10, 9, 3)],
];

export type Offset = { standardSec: number; dstMin: 0 | 60 };

function standardAtUtc(utcMs: number): number {
  let std = H900;
  for (const [wall, next] of STANDARD_CHANGES) {
    if (utcMs >= wall - std * 1000) std = next;
    else break;
  }
  return std;
}

export function offsetAtUtc(utcMs: number): Offset {
  const std = standardAtUtc(utcMs);
  for (const [start, end] of DST_PERIODS) {
    const startUtc = start - std * 1000;
    const endUtc = end - (std * 1000 + HOUR);
    if (utcMs >= startUtc && utcMs < endUtc) return { standardSec: std, dstMin: 60 };
  }
  return { standardSec: std, dstMin: 0 };
}

const totalSec = (o: Offset) => o.standardSec + o.dstMin * 60;

export type ClockConversion = {
  utcMs: number;
  offset: Offset;
  kind: 'normal' | 'nonexistent' | 'ambiguous';
};

export function clockToUtc(clockMs: number): ClockConversion {
  const candidates = new Map<number, Offset>();
  for (const probe of [clockMs - 2 * 86_400_000, clockMs, clockMs + 2 * 86_400_000]) {
    const o = offsetAtUtc(probe - H900 * 1000);
    candidates.set(totalSec(o), o);
  }
  const valid: ClockConversion[] = [];
  for (const [sec, o] of candidates) {
    const utcMs = clockMs - sec * 1000;
    const actual = offsetAtUtc(utcMs);
    if (totalSec(actual) === sec) valid.push({ utcMs, offset: actual, kind: 'normal' });
  }
  if (valid.length === 1) return valid[0];
  if (valid.length > 1) {
    valid.sort((a, b) => a.utcMs - b.utcMs);
    return { ...valid[0], kind: 'ambiguous' };
  }

  const after = offsetAtUtc(clockMs - H900 * 1000 + 86_400_000);
  return { utcMs: clockMs - totalSec(after) * 1000, offset: after, kind: 'nonexistent' };
}
