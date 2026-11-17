// Independent check of the jeol (month-opening solar term) times against astronomy-engine.
import * as Astronomy from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { jieInMonth } from '../src/jeolip';

// Apparent solar longitude at which each jeol begins.
const LONGITUDE: Record<string, number> = {
  小寒: 285, 立春: 315, 惊蛰: 345, 清明: 15, 立夏: 45, 芒种: 75, 小暑: 105, 立秋: 135, 白露: 165, 寒露: 195, 立冬: 225, 大雪: 255,
};

describe('jeol times vs astronomy-engine', () => {
  it('every jeol 1900-2099 is within 90 seconds of an independent computation', () => {
    let n = 0;
    let maxSec = 0;
    for (let y = 1900; y <= 2099; y++) for (let m = 1; m <= 12; m++) {
      const j = jieInMonth(y, m);
      const utcMs = j.ms - 9 * 3_600_000; // jeol times are stored as KST wall clock
      const t = Astronomy.SearchSunLongitude(LONGITUDE[j.name], new Date(utcMs - 3 * 86_400_000), 6);
      expect(t, `${y}-${m} ${j.name}`).not.toBeNull();
      maxSec = Math.max(maxSec, Math.abs(t!.date.getTime() - utcMs) / 1000);
      n++;
    }
    expect(n).toBe(2400);
    expect(maxSec).toBeLessThan(90);
  });
});
