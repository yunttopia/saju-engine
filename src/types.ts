// Input, result and error types.
import type { Pillar } from './ganzhi';
import type { Jeolip } from './jeolip';

export type ManseInput = {
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
  time: { hour: number; minute: number } | null;
  sex: 'M' | 'F';
};

export type Warning = 'NONEXISTENT_LOCAL_TIME' | 'AMBIGUOUS_LOCAL_TIME' | 'JEOLIP_DAY_TIME_UNKNOWN';

export type TimeInfo = {
  clock: string;
  utc: string;
  corrected: string;
  standardOffsetMin: number;
  standardOffsetSec: number;
  dstMin: 0 | 60;
  longitudeCorrectionMin: number;
  longitudeCorrectionSec: number;
  dstCorrectionMin: 0 | -60;
  totalCorrectionMin: number;
  totalCorrectionSec: number;
};

export type DaeunEntry = { order: number; age: number; pillar: Pillar };

export type ManseResult = {
  ok: true;
  specVersion: 'manse-v1';
  input: ManseInput;
  solar: { year: number; month: number; day: number; hour: number | null; minute: number | null };
  lunar: { year: number; month: number; day: number; isLeapMonth: boolean };
  time: TimeInfo;
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  solarYear: number;
  jeolip: { prev: Jeolip; next: Jeolip };
  daeun: {
    direction: 'forward' | 'backward';
    startMinutes: number;
    startYearsExact: number;
    startMonthsTotal: number;
    daeunsu: number;
    list: DaeunEntry[];
  };
  warnings: Warning[];
};

export type ManseErrorCode = 'INVALID_INPUT' | 'OUT_OF_RANGE' | 'INVALID_LUNAR_DATE';
export type ManseErrorDetail = 'NO_SUCH_MONTH' | 'DAY_OUT_OF_MONTH';
export type ManseError = { ok: false; error: { code: ManseErrorCode; detail?: ManseErrorDetail; message: string } };

export type { Pillar, Jeolip };
