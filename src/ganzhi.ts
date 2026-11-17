// Heavenly stems, earthly branches and the sexagenary (60-pillar) cycle. Hanzi strings are data.
export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

export type Pillar = {
  ganzhi: string;
  stem: string;
  branch: string;
  stemIndex: number;
  branchIndex: number;
  index: number;
};

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function pillarOf(index: number): Pillar {
  const i = mod(index, 60);
  const s = i % 10;
  const b = i % 12;
  return { ganzhi: STEMS[s] + BRANCHES[b], stem: STEMS[s], branch: BRANCHES[b], stemIndex: s, branchIndex: b, index: i };
}

export function pillarFromParts(stemIndex: number, branchIndex: number): Pillar {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stemIndex && i % 12 === branchIndex) return pillarOf(i);
  }
  throw new Error(`invalid ganzhi ${stemIndex}/${branchIndex}`);
}
