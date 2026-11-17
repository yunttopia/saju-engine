// Builds Korean lunar months from new moons and principal terms in UTC+9 (shared by the generator and the tests).
export const DAY = 86_400_000;
export type Source = { newMoonsUT(fromMs: number, toMs: number): number[]; principalTermsUT(fromMs: number, toMs: number): { ms: number; lon: number }[] };
export type LunarMonth = { startDay: number; endDay: number; year: number; month: number; leap: boolean };

export const dateOffsetHours = (utMs: number) => (utMs < Date.UTC(1912, 0, 1) - 9 * 3_600_000 ? 8 : 9);

export function buildMonths(src: Source, fromYear: number, toYear: number): LunarMonth[] {
  const from = Date.UTC(fromYear - 1, 9, 1);
  const to = Date.UTC(toYear + 1, 3, 1);
  const dayOf = (ms: number) => Math.floor((ms + dateOffsetHours(ms) * 3_600_000) / DAY);
  const nm = src.newMoonsUT(from, to).map(dayOf);
  const zq = src.principalTermsUT(from, to).map((z) => ({ d: dayOf(z.ms), lon: z.lon }));
  const raw = [];
  for (let i = 0; i + 1 < nm.length; i++) {
    const qs = zq.filter((z) => z.d >= nm[i] && z.d < nm[i + 1]);
    raw.push({ s: nm[i], e: nm[i + 1], hasWS: qs.some((q) => q.lon === 270), noZ: qs.length === 0 });
  }
  const ws = raw.map((m, i) => (m.hasWS ? i : -1)).filter((i) => i >= 0);
  const out: LunarMonth[] = [];
  for (let w = 0; w + 1 < ws.length; w++) {
    const a = ws[w];
    const b = ws[w + 1];
    let leapIdx = -1;
    if (b - a === 13) for (let i = a + 1; i < b; i++) if (raw[i].noZ) { leapIdx = i; break; }
    if (b - a !== 12 && b - a !== 13) throw new Error(`unexpected span ${b - a}`);
    if (b - a === 13 && leapIdx < 0) throw new Error('no leap month found');
    let num = 11;
    for (let i = a; i < b; i++) {
      const leap = i === leapIdx;
      if (i !== a && !leap) num = (num % 12) + 1;
      out.push({ startDay: raw[i].s, endDay: raw[i].e, year: NaN, month: num, leap });
    }
  }
  let cur = NaN;
  for (const m of out) {
    if (m.month === 1 && !m.leap) cur = new Date(m.startDay * DAY).getUTCFullYear();
    m.year = cur;
  }
  return out.filter((m) => !Number.isNaN(m.year));
}
