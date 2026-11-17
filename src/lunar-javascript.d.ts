// Minimal type declarations for lunar-javascript.
declare module 'lunar-javascript' {
  interface SolarDate {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): LunarDate;
  }
  interface LunarDate {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getSolar(): SolarDate;
  }
  const pkg: {
    Solar: { fromYmd(y: number, m: number, d: number): SolarDate };
    Lunar: { fromYmd(y: number, m: number, d: number): LunarDate };
    LunarYear: { fromYear(y: number): { getJieQiJulianDays(): number[] } };
    LunarUtil: { JIE_QI_IN_USE: string[] };

    ShouXingUtil: { PI_2: number; msaLonT(w: number): number; saLonT(w: number): number; dtT(t: number): number };
  };
  export default pkg;
}
