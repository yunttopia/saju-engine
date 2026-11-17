// The 12 jeol (month-opening solar terms) from lunar-javascript, shown in KST (library value + 1 hour).
import LunarPkg from 'lunar-javascript';
import { fmtMilli, fmtMinuteDisplay, HOUR, parts } from './naive';

const { LunarYear, LunarUtil } = LunarPkg;

export const JIE_BRANCH: Record<string, number> = {
  立春: 2, 惊蛰: 3, 清明: 4, 立夏: 5, 芒种: 6, 小暑: 7,
  立秋: 8, 白露: 9, 寒露: 10, 立冬: 11, 大雪: 0, 小寒: 1,
};

const UPPER_ALIAS: Record<string, string> = {
  LI_CHUN: '立春', JING_ZHE: '惊蛰', DA_XUE: '大雪', XIAO_HAN: '小寒',
};

export type JieTime = { name: string; branchIndex: number; ms: number };

const cache = new Map<number, JieTime[]>();

function fromLunarYear(y: number): JieTime[] {
  const hit = cache.get(y);
  if (hit) return hit;
  const jds = LunarYear.fromYear(y).getJieQiJulianDays();
  const names = LunarUtil.JIE_QI_IN_USE;
  const out: JieTime[] = [];
  names.forEach((raw, i) => {
    const name = UPPER_ALIAS[raw] ?? raw;
    if (!(name in JIE_BRANCH)) return;
    const ms = Math.round((jds[i] - 2440587.5) * 86_400_000) + HOUR;
    out.push({ name, branchIndex: JIE_BRANCH[name], ms });
  });
  cache.set(y, out);
  return out;
}

export function jieAround(y: number): JieTime[] {
  const seen = new Map<string, JieTime>();
  for (const ly of [y - 1, y, y + 1]) {
    for (const j of fromLunarYear(ly)) {
      const key = `${j.name}|${parts(j.ms).year}`;
      if (!seen.has(key)) seen.set(key, j);
    }
  }
  return [...seen.values()].sort((a, b) => a.ms - b.ms);
}

export function prevNext(clockMs: number): { prev: JieTime; next: JieTime } {
  const list = jieAround(parts(clockMs).year);
  let i = list.length - 1;
  while (i >= 0 && list[i].ms > clockMs) i--;
  if (i < 0 || i + 1 >= list.length) throw new Error('jeolip table does not cover clock time');
  return { prev: list[i], next: list[i + 1] };
}

export function ipchun(year: number): JieTime {
  const j = jieAround(year).find((x) => x.name === '立春' && parts(x.ms).year === year);
  if (!j) throw new Error(`立春 not found for ${year}`);
  return j;
}

export function jieInMonth(year: number, month: number): JieTime {
  const js = jieAround(year).filter((x) => parts(x.ms).year === year && parts(x.ms).month === month);
  if (js.length !== 1) throw new Error(`expected exactly one jie in ${year}-${month}, got ${js.length}`);
  return js[0];
}

export type Jeolip = { name: string; branch: string; kst: string; kstDisplay: string };

export function toJeolip(j: JieTime): Jeolip {
  return { name: j.name, branch: '子丑寅卯辰巳午未申酉戌亥'[j.branchIndex], kst: fmtMilli(j.ms), kstDisplay: fmtMinuteDisplay(j.ms) };
}
