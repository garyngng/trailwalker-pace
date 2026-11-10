/** Shared race data & helpers for runner + support pages. */
window.TrailwalkerShared = (() => {
  const RACE_YEAR = 2026;
  const RACE_DAY = 20;
  const START_HOUR = 8;
  const START_MINUTE = 0;
  const TZ = "Asia/Hong_Kong";
  const TOTAL_KM = 100;

  const TARGETS = [18, 20, 22, 24, 26, 28];

  /** Official CP cumulative minutes from start. */
  const OFFICIAL_TIMETABLE = {
    cp1: [164, 180, 186, 192, 198, 204],
    cp2: [251, 275, 285, 295, 309, 327],
    cp3: [375, 415, 435, 455, 480, 510],
    cp4: [518, 570, 612, 654, 702, 756],
    cp5: [614, 670, 732, 794, 852, 906],
    cp6: [675, 735, 789, 843, 906, 978],
    cp7: [800, 870, 942, 1014, 1098, 1194],
    cp8: [907, 995, 1083, 1171, 1266, 1368],
    cp9: [993, 1095, 1197, 1299, 1404, 1512],
    finish: [1080, 1200, 1320, 1440, 1560, 1680],
  };

  const OFFICIAL_CPS = [
    { id: "cp1", code: "CP1", name: "一號檢查站", km: 10.2, key: "cp1", kind: "official" },
    { id: "cp2", code: "CP2", name: "二號檢查站", km: 25.4, key: "cp2", kind: "official" },
    { id: "cp3", code: "CP3", name: "三號檢查站", km: 34.1, key: "cp3", kind: "official" },
    { id: "cp4", code: "CP4", name: "四號檢查站", km: 47.8, key: "cp4", kind: "official" },
    { id: "cp5", code: "CP5", name: "五號檢查站", km: 55.1, key: "cp5", kind: "official" },
    { id: "cp6", code: "CP6", name: "六號檢查站", km: 61.1, key: "cp6", kind: "official" },
    { id: "cp7", code: "CP7", name: "七號檢查站", km: 73.1, key: "cp7", kind: "official" },
    { id: "cp8", code: "CP8", name: "八號檢查站", km: 82.5, key: "cp8", kind: "official" },
    { id: "cp9", code: "CP9", name: "九號檢查站", km: 93.1, key: "cp9", kind: "official" },
    { id: "cp10", code: "CP10", name: "終點 Finish", km: 100, key: "finish", kind: "official" },
  ];

  /**
   * Support waypoints — km placed on course; times interpolated by distance
   * between neighbouring official CPs.
   *
   * Fact-check vs Oxfam Trailwalker / MacLehose route:
   * - CP3 企嶺下 → CP4 基維爾營：經馬鞍山山脊（馬鞍山公廁／燒烤場一帶）
   * - CP4 基維爾營（飛鵝山）→ CP5 畢架山：經飛鵝山道／沙田坳／獅子亭（飛鵝山觀景台支援點）
   * - CP6 走私坳 → CP7 鉛礦坳：經城門水塘燒烤場再上針山
   */
  const SUPPORT_WAYPOINTS = [
    {
      id: "wp-maonshan",
      code: "支援",
      name: "馬鞍山公廁",
      km: 38.5,
      kind: "support",
      note: "CP3→CP4 之間（馬鞍山段）· 距離插值 · 非 CP5–CP6",
    },
    {
      id: "wp-feingoshan",
      code: "支援",
      name: "飛鵝山觀景台",
      km: 50.5,
      kind: "support",
      note: "CP4→CP5 之間（飛鵝山道／沙田坳一帶）· 距離插值",
    },
    {
      id: "wp-shingmun",
      code: "支援",
      name: "城門水塘4號燒烤",
      km: 64.0,
      kind: "support",
      note: "CP6→CP7 之間（城門水塘燒烤場，上針山前）· 距離插值",
    },
  ];

  function raceStartDate() {
    return new Date(
      `${RACE_YEAR}-11-${String(RACE_DAY).padStart(2, "0")}T${String(START_HOUR).padStart(2, "0")}:${String(START_MINUTE).padStart(2, "0")}:00+08:00`
    );
  }

  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function findFlankingOfficial(km) {
    const sorted = OFFICIAL_CPS.slice().sort((a, b) => a.km - b.km);
    if (km <= sorted[0].km) {
      return { prev: null, next: sorted[0], t: 0 };
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      const prev = sorted[i];
      const next = sorted[i + 1];
      if (km >= prev.km && km <= next.km) {
        const t = (km - prev.km) / (next.km - prev.km);
        return { prev, next, t };
      }
    }
    const last = sorted[sorted.length - 1];
    return { prev: last, next: null, t: 1 };
  }

  /** Cumulative minutes at a given km for each target index. */
  function cumulativeAtKm(km) {
    const { prev, next, t } = findFlankingOfficial(km);
    return TARGETS.map((_, i) => {
      if (!prev && next) {
        // Before first CP: scale from start (0) to CP1
        return Math.round(lerp(0, OFFICIAL_TIMETABLE[next.key][i], km / next.km));
      }
      if (prev && !next) return OFFICIAL_TIMETABLE[prev.key][i];
      const a = OFFICIAL_TIMETABLE[prev.key][i];
      const b = OFFICIAL_TIMETABLE[next.key][i];
      return Math.round(lerp(a, b, t));
    });
  }

  function buildRoutePoints() {
    const merged = [...OFFICIAL_CPS, ...SUPPORT_WAYPOINTS].sort((a, b) => a.km - b.km);
    return merged.map((point) => {
      const times =
        point.kind === "official"
          ? OFFICIAL_TIMETABLE[point.key].slice()
          : cumulativeAtKm(point.km);
      return { ...point, times };
    });
  }

  function segmentMinutesFromRoute(route, index, targetIndex) {
    const cum = route[index].times[targetIndex];
    if (index === 0) return cum;
    return cum - route[index - 1].times[targetIndex];
  }

  function legKmFromRoute(route, index) {
    const prevKm = index === 0 ? 0 : route[index - 1].km;
    return Math.round((route[index].km - prevKm) * 10) / 10;
  }

  function formatEtaClock(elapsedMin, start = raceStartDate()) {
    const arrival = addMinutes(start, elapsedMin);
    const clock = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(arrival);

    const startDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(start);
    const arrivalDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(arrival);

    const dayDiff = Math.round(
      (new Date(`${arrivalDay}T12:00:00+08:00`).getTime() -
        new Date(`${startDay}T12:00:00+08:00`).getTime()) /
        86400000
    );

    if (dayDiff <= 0) return clock;
    return `${clock} (+${dayDiff})`;
  }

  function minutesOnlyLabel(totalMinutes) {
    return `${Math.round(totalMinutes)} 分鐘`;
  }

  function formatClock(date) {
    return new Intl.DateTimeFormat("zh-HK", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  }

  function elapsedMinutesNow(start = raceStartDate(), now = new Date()) {
    return (now.getTime() - start.getTime()) / 60000;
  }

  return {
    RACE_YEAR,
    RACE_DAY,
    START_HOUR,
    START_MINUTE,
    TZ,
    TOTAL_KM,
    TARGETS,
    OFFICIAL_TIMETABLE,
    OFFICIAL_CPS,
    SUPPORT_WAYPOINTS,
    raceStartDate,
    addMinutes,
    buildRoutePoints,
    segmentMinutesFromRoute,
    legKmFromRoute,
    formatEtaClock,
    minutesOnlyLabel,
    formatClock,
    elapsedMinutesNow,
    cumulativeAtKm,
  };
})();
