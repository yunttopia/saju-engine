# saju-engine

[![CI](https://github.com/yunttopia/saju-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/yunttopia/saju-engine/actions/workflows/ci.yml)

**Korean saju / manseryeok (만세력) calculator in TypeScript** — the calendar math behind the Four Pillars of Destiny (BaZi, 四柱八字) for births in Korea: Korean lunar calendar conversion, the sexagenary cycle (60 ganji, 干支), the month-opening jeol of the 24 solar terms, Korean time zone history, and daeun (10-year luck pillars).

Given a birth date and time in Korea, it returns:

- the year, month, day and hour pillars in the sexagenary cycle, e.g. `庚午 壬午 辛亥 乙未`;
- the conversion between the solar calendar and the **Korean** lunar calendar (with leap months);
- the previous and next *jeol* (the 12 of the 24 solar terms that open each month) with their times in KST;
- the clock-to-solar-time correction, including Korean daylight saving time and the 1954–1961 UTC+8:30 standard time;
- ten-year luck pillars (*daeun*) with their start age, and yearly/monthly pillars (*seun*, *wolun*).

It is a pure, deterministic calculation library. It is **not fortune-telling**: it does not interpret charts, score anything, or predict the future.

**Accuracy in one line:** every jeol 1900–2099 (2,400) is within about 62 seconds of an independent astronomy-engine computation, the Korean lunar table matches two independent sources month by month and day by day and regenerates byte-for-byte, and a 153-case regression suite guards against changes (details below).

## Usage

TypeScript source with extensionless imports: run it with `tsx` or a bundler (plain `node` cannot import it). Not published to npm.

```sh
git clone https://github.com/yunttopia/saju-engine && cd saju-engine && npm ci && npm test
```

```ts
import { calcManse } from "./src/index";

const r = calcManse({ calendar: "solar", year: 1990, month: 6, day: 15, time: { hour: 13, minute: 30 }, sex: "M" });
if (r.ok) {
  console.log(r.pillars.year.ganzhi, r.pillars.month.ganzhi, r.pillars.day.ganzhi, r.pillars.hour?.ganzhi); // 庚午 壬午 辛亥 乙未
  console.log(r.time.corrected); // 1990-06-15T13:00:00 (solar-time corrected)
  console.log(r.lunar);          // { year: 1990, month: 5, day: 23, isLeapMonth: false }
  console.log(r.daeun.daeunsu);  // 7
}
```

Lunar input: `{ calendar: "lunar", year, month, day, isLeapMonth, ... }`. Unknown birth time: `time: null` (computed at 12:00, no hour pillar). `calcManse` returns errors instead of throwing: `{ ok: false, error: { code: "INVALID_INPUT" | "OUT_OF_RANGE" | "INVALID_LUNAR_DATE", ... } }`. `seun` and `wolun` throw `RangeError` for non-integer or out-of-range years.

## How accuracy is checked

- **Korean lunar calendar.** The built-in table (`src/korean-lunar-table.ts`, 1900–2099) is generated from new moons and principal solar terms computed with [lunar-javascript](https://github.com/6tail/lunar-javascript) (寿星 algorithm) in UTC+9. The tests compare every month 1900–2099 with an independent computation using [astronomy-engine](https://github.com/cosinekitty/astronomy), and every day 1900-01-31 to 2050-12-31 with [korean-lunar-calendar](https://github.com/usingsky/korean_lunar_calendar_js) (data from the Korea Astronomy and Space Science Institute).
- **Time zone history.** Offsets and DST periods are constants taken from tzdb 2026e (`Asia/Seoul`), checked against Node's `Intl` every 3 hours from 1900 to 2099.
- **Solar terms.** From lunar-javascript, shown in KST. The tests compare all 2,400 jeol from 1900 to 2099 with astronomy-engine; the largest difference is about 62 seconds.
- **Regression suite.** 153 synthetic boundary inputs (term boundaries, DST gaps and overlaps, midnight, leap months, invalid input) with stored outputs. The snapshot is the engine's own output, so it guards against changes rather than proving correctness.

## Conventions (where sources differ)

- Solar-time correction uses a fixed UTC+8:30 reference (about 127.5°E), i.e. Seoul, not the actual birthplace.
- Before 1908-04-01 the engine uses UTC+9 by convention; tzdb has local mean time (+8:27:52).
- The day changes at 23:00 corrected time (start of the 子 hour).
- Daeun start age = minutes between birth and the adjacent *jeol* ÷ 4320 (3 days = 1 year), rounded half up, minimum 1.
- Age in `seun` is the traditional Korean count (solar year − birth year + 1).
- Year and month pillars compare the clock time as entered with the jeol time written in KST (UTC+9). During daylight saving time and the UTC+8:30 periods (1908–1911, 1948–1951, 1954–1961, 1987–1988) this differs from the true instant by 30–60 minutes; births that close to a jeol may get a different month (or year) pillar than tools that compare true instants.

## Limits

- Range: solar 1900-01-01 to 2099-12-31, Korea only. Lunar input is accepted when it falls in that solar range (e.g. lunar 1899-12-01 = solar 1900-01-01).
- Solar term times come straight from lunar-javascript (stored to the millisecond); displayed times are truncated to the minute.
- Hanzi strings (stems, branches, solar term names) are data and appear in outputs.
- Not affiliated with any fortune-telling service.

## 한국어 요약

**saju-engine** 는 한국 기준 **만세력** 계산 라이브러리입니다(TypeScript).

- 생년월일시를 넣으면 **사주팔자**의 네 기둥(연주·월주·일주·시주)을 60갑자로 계산합니다.
- 양력 ↔ 한국 **음력 변환**(윤달 포함, 1900~2099년)을 합니다.
- 매달을 여는 **절기**(24절기 가운데 12절)의 시각을 한국 시간으로 냅니다.
- 한국 서머타임과 1954~1961년 표준시(UTC+8:30)를 반영한 시각 보정을 합니다.
- **대운**(10년 운)의 시작 나이와 순서, 세운·월운을 계산합니다.
- 연주·월주는 입력한 시계 시각을 한국 시간(UTC+9)으로 적은 절입 시각과 비교합니다. 서머타임·UTC+8:30 시기(1908~1911, 1948~1951, 1954~1961, 1987~1988)에 절입 앞뒤 30~60분 안에 태어났다면 다른 만세력과 월주(입춘이면 연주)가 다를 수 있습니다.

정확도 근거: 1900~2099년 절입 2,400개를 독립 천문 계산(astronomy-engine)과 대조해 최대 약 62초 차이, 음력표는 독립 자료 둘과 달·날짜별로 대조하고 다시 만들면 똑같이 나옵니다. 경계 사례 153건은 바뀜을 잡는 회귀 시험입니다. **운세·미래 예측 서비스가 아닙니다.** 풀이·해석 없이 계산만 합니다.

## License

MIT — see [LICENSE](LICENSE). Security reports: see [SECURITY.md](SECURITY.md).
