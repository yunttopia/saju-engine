// Regenerates expected.json from synthetic-inputs.json with the current engine (a regression snapshot, not an external truth).
// Usage: npx tsx test/fixtures/make-expected.ts
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calcManse, type ManseInput } from '../../src/index';

const dir = (f: string) => fileURLToPath(new URL(`./${f}`, import.meta.url));

export function expectedFields(input: ManseInput): Record<string, string> {
  const r = calcManse(input);
  if (!r.ok) return { error: r.error.detail ? `${r.error.code}/${r.error.detail}` : r.error.code };
  const p = r.pillars;
  return {
    pillars: [p.year, p.month, p.day, p.hour].map((x) => x?.ganzhi ?? '-').join(' '),
    solarYear: String(r.solarYear),
    corrected: r.time.corrected,
    totalCorrectionSec: String(r.time.totalCorrectionSec),
    daeun: `${r.daeun.direction}|${r.daeun.daeunsu}|${r.daeun.list.map((d) => d.pillar.ganzhi).join(' ')}`,
    jeolip: `${r.jeolip.prev.name} ${r.jeolip.prev.kst}|${r.jeolip.next.name} ${r.jeolip.next.kst}`,
    warnings: [...r.warnings].sort().join(','),
    solarDate: `${r.solar.year}-${String(r.solar.month).padStart(2, '0')}-${String(r.solar.day).padStart(2, '0')}`,
    lunar: `${r.lunar.year}-${r.lunar.isLeapMonth ? 'L' : ''}${String(r.lunar.month).padStart(2, '0')}-${String(r.lunar.day).padStart(2, '0')}`,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const raw = readFileSync(dir('synthetic-inputs.json'));
  const inputs = JSON.parse(raw.toString('utf8')) as { cases: Array<{ id: string; input: ManseInput }> };
  const cases: Record<string, Record<string, string>> = {};
  for (const c of inputs.cases) cases[c.id] = expectedFields(c.input);
  const out = { source: 'make-expected.ts', inputsSha256: createHash('sha256').update(raw).digest('hex'), cases };
  writeFileSync(dir('expected.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`${Object.keys(cases).length} cases`);
}
