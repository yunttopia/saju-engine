// Wall-clock (time-zone-less) values carried on the UTC millisecond axis, plus formatting helpers.
export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export function naiveMs(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): number {
  const dt = new Date(0);
  dt.setUTCFullYear(y, mo - 1, d);
  dt.setUTCHours(h, mi, s, 0);
  return dt.getTime();
}

export function parts(ms: number) {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    millisecond: d.getUTCMilliseconds(),
  };
}

const p2 = (n: number) => String(n).padStart(2, '0');
const p3 = (n: number) => String(n).padStart(3, '0');
const p4 = (n: number) => String(n).padStart(4, '0');

export function fmtDate(ms: number): string {
  const p = parts(ms);
  return `${p4(p.year)}-${p2(p.month)}-${p2(p.day)}`;
}

export function fmtMinute(ms: number): string {
  const p = parts(ms);
  const base = `${fmtDate(ms)}T${p2(p.hour)}:${p2(p.minute)}`;
  return p.second || p.millisecond ? `${base}:${p2(p.second)}` : base;
}

export function fmtSecond(ms: number): string {
  const p = parts(ms);
  return `${fmtDate(ms)}T${p2(p.hour)}:${p2(p.minute)}:${p2(p.second)}`;
}

export function fmtMilli(ms: number): string {
  const p = parts(ms);
  return `${fmtDate(ms)}T${p2(p.hour)}:${p2(p.minute)}:${p2(p.second)}.${p3(p.millisecond)}`;
}

export function fmtMinuteDisplay(ms: number): string {
  const r = Math.floor(ms / 60_000) * 60_000;
  const p = parts(r);
  return `${fmtDate(r)} ${p2(p.hour)}:${p2(p.minute)}`;
}

export function fmtUtc(ms: number): string {
  const p = parts(ms);
  return `${fmtDate(ms)}T${p2(p.hour)}:${p2(p.minute)}:${p2(p.second)}Z`;
}

export function daysInMonth(y: number, mo: number): number {
  return parts(naiveMs(y, mo + 1, 0)).day;
}
