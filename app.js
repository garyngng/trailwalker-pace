(() => {
  const RACE_YEAR = 2026;
  const RACE_DAY = 20;
  const START_HOUR = 8;
  const START_MINUTE = 30;
  const TZ = "Asia/Hong_Kong";
  const TOTAL_KM = 100;
  const RING = 2 * Math.PI * 52;

  /** Elapsed minutes from start for each target finish (hours). 18h interpolated between 15h & 20h. */
  const TARGETS = [15, 18, 20, 25, 30, 35, 40, 45];

  const TIMETABLE = {
    // minutes to reach each CP for each target (aligned with TARGETS)
    cp1: [140, 164, 180, 195, 210, 240, 240, 360],
    cp2: [215, 251, 275, 300, 345, 390, 420, 555],
    cp3: [315, 375, 415, 465, 540, 600, 660, 840],
    cp4: [440, 518, 570, 675, 810, 900, 1020, 1290],
    cp5: [530, 614, 670, 825, 960, 1080, 1230, 1530],
    cp6: [585, 675, 735, 870, 1050, 1170, 1320, 1690],
    cp7: [695, 800, 870, 1050, 1290, 1470, 1650, 2050],
    cp8: [775, 907, 995, 1215, 1470, 1680, 1920, 2290],
    cp9: [840, 993, 1095, 1350, 1620, 1890, 2160, 2490],
    finish: [900, 1080, 1200, 1500, 1800, 2100, 2400, 2690], // 45h finish = 44h50m
  };

  const CHECKPOINTS = [
    { id: "cp1", code: "CP1", name: "一號檢查站", km: 10.2, key: "cp1" },
    { id: "cp2", code: "CP2", name: "二號檢查站", km: 25.4, key: "cp2" },
    { id: "cp3", code: "CP3", name: "三號檢查站", km: 34.1, key: "cp3" },
    { id: "cp4", code: "CP4", name: "四號檢查站", km: 47.8, key: "cp4" },
    { id: "cp5", code: "CP5", name: "五號檢查站", km: 55.1, key: "cp5" },
    { id: "cp6", code: "CP6", name: "六號檢查站", km: 61.1, key: "cp6" },
    { id: "cp7", code: "CP7", name: "七號檢查站", km: 73.1, key: "cp7" },
    { id: "cp8", code: "CP8", name: "八號檢查站", km: 82.5, key: "cp8" },
    { id: "cp9", code: "CP9", name: "九號檢查站", km: 93.1, key: "cp9" },
    { id: "cp10", code: "CP10", name: "終點 Finish", km: 100, key: "finish" },
  ];

  const els = {
    liveClock: document.getElementById("liveClock"),
    cpGrid: document.getElementById("cpGrid"),
    result: document.getElementById("result"),
    resultCpLabel: document.getElementById("resultCpLabel"),
    resultTitle: document.getElementById("resultTitle"),
    startTime: document.getElementById("startTime"),
    arrivalTime: document.getElementById("arrivalTime"),
    elapsedTime: document.getElementById("elapsedTime"),
    kmDone: document.getElementById("kmDone"),
    kmLeft: document.getElementById("kmLeft"),
    pctDone: document.getElementById("pctDone"),
    kmProgress: document.getElementById("kmProgress"),
    paceHeadline: document.getElementById("paceHeadline"),
    paceDetail: document.getElementById("paceDetail"),
    paceNext: document.getElementById("paceNext"),
    bracketList: document.getElementById("bracketList"),
    clearBtn: document.getElementById("clearBtn"),
    manualCp: document.getElementById("manualCp"),
    manualStart: document.getElementById("manualStart"),
    manualTime: document.getElementById("manualTime"),
    manualSubmit: document.getElementById("manualSubmit"),
    fillRaceDefault: document.getElementById("fillRaceDefault"),
    paceTable: document.getElementById("paceTable"),
  };

  function raceStartDate() {
    // Construct wall-clock start in Hong Kong as a local Date for comparisons.
    // Use a fixed offset string so race day is always 08:30 HKT regardless of device TZ.
    return new Date(`${RACE_YEAR}-11-${String(RACE_DAY).padStart(2, "0")}T${String(START_HOUR).padStart(2, "0")}:${String(START_MINUTE).padStart(2, "0")}:00+08:00`);
  }

  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
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

  function formatDateTime(date) {
    return new Intl.DateTimeFormat("zh-HK", {
      timeZone: TZ,
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  }

  function minutesToLabel(totalMinutes) {
    const sign = totalMinutes < 0 ? "-" : "";
    const abs = Math.abs(Math.round(totalMinutes));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    if (h === 0) return `${sign}${m} 分鐘`;
    return `${sign}${h} 小時 ${String(m).padStart(2, "0")} 分`;
  }

  function minutesToShort(totalMinutes) {
    const abs = Math.round(totalMinutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
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

  function elapsedMinutes(arrival, start = raceStartDate()) {
    return (arrival.getTime() - start.getTime()) / 60000;
  }

  function analyzePace(cp, elapsedMin) {
    const targets = TIMETABLE[cp.key];
    const rows = TARGETS.map((goal, i) => {
      const targetMin = targets[i];
      const delta = elapsedMin - targetMin; // negative = faster than this goal
      return { goal, targetMin, delta, index: i };
    });

    // Find bracket: which goals the arrival sits between
    let fasterGoal = null; // next faster target (need to speed up to hit)
    let slowerOrEqual = null; // current / slower bound

    for (let i = 0; i < rows.length; i++) {
      if (elapsedMin <= rows[i].targetMin) {
        slowerOrEqual = rows[i];
        fasterGoal = i > 0 ? rows[i - 1] : null;
        break;
      }
    }

    if (!slowerOrEqual) {
      // Slower than slowest published target
      const last = rows[rows.length - 1];
      return {
        rows,
        headline: `慢過 ${last.goal} 小時目標`,
        detail: `呢個 CP 你已用 ${minutesToLabel(elapsedMin)}，比 ${last.goal} 小時參考慢 ${minutesToLabel(elapsedMin - last.targetMin)}。`,
        nextHtml: `要追返 ${last.goal} 小時節奏，要快 ${minutesToLabel(elapsedMin - last.targetMin)}。`,
        hitGoal: last.goal,
        status: "beyond",
      };
    }

    if (!fasterGoal) {
      // Faster than or equal to fastest (15h)
      const best = rows[0];
      const ahead = best.targetMin - elapsedMin;
      return {
        rows,
        headline: ahead <= 0.5 ? `正跟住 ${best.goal} 小時目標` : `快過 ${best.goal} 小時目標`,
        detail:
          ahead <= 0.5
            ? `你到達時間同 ${best.goal} 小時參考幾乎一樣（差少過半分鐘）。`
            : `呢個 CP 你快過 ${best.goal} 小時參考 ${minutesToLabel(ahead)}。繼續保持！`,
        nextHtml: `下一個較鬆目標係 ${rows[1].goal} 小時：你仲快 ${minutesToLabel(rows[1].targetMin - elapsedMin)}。`,
        hitGoal: best.goal,
        status: "elite",
      };
    }

    const lower = fasterGoal; // faster finish goal (smaller hours)
    const upper = slowerOrEqual; // slower finish goal
    const toFaster = elapsedMin - lower.targetMin; // how much faster needed for next tier
    const toSlower = upper.targetMin - elapsedMin;

    // On (or within ~30s of) a published target
    if (toSlower <= 0.5) {
      return {
        rows,
        headline: `正跟住 ${upper.goal} 小時目標`,
        detail: `呢個 CP 到達時間同 ${upper.goal} 小時參考幾乎一樣。`,
        nextHtml: `若再快 <strong>${minutesToLabel(toFaster)}</strong>，就可以升上 <strong>${lower.goal} 小時</strong> 分段。`,
        hitGoal: upper.goal,
        status: "on",
        lower,
        upper,
      };
    }
    if (toFaster <= 0.5) {
      return {
        rows,
        headline: `正跟住 ${lower.goal} 小時目標`,
        detail: `呢個 CP 到達時間同 ${lower.goal} 小時參考幾乎一樣。`,
        nextHtml: `仲有 <strong>${minutesToLabel(toSlower)}</strong> 緩衝先會跌入 ${upper.goal} 小時分段。`,
        hitGoal: lower.goal,
        status: "on",
        lower,
        upper,
      };
    }

    const span = upper.targetMin - lower.targetMin;
    const pos = elapsedMin - lower.targetMin;
    const ratio = span > 0 ? pos / span : 0;
    const projected = lower.goal + ratio * (upper.goal - lower.goal);

    return {
      rows,
      headline: `${lower.goal}–${upper.goal} 小時之間`,
      detail: `推算而家大概跟住約 <strong>${projected.toFixed(1)} 小時</strong> 完成節奏（喺 ${lower.goal}h 同 ${upper.goal}h 之間）。`,
      nextHtml: `再快 <strong>${minutesToLabel(toFaster)}</strong> 就可以入到 <strong>${lower.goal} 小時</strong> 分段；仲有 <strong>${minutesToLabel(toSlower)}</strong> 緩衝先會跌入 ${upper.goal} 小時。`,
      hitGoal: upper.goal,
      status: "between",
      lower,
      upper,
    };
  }

  function renderCheckpoints() {
    els.cpGrid.innerHTML = CHECKPOINTS.map(
      (cp) => `
      <button type="button" class="cp-btn" data-id="${cp.id}" aria-label="${cp.code} ${cp.name}">
        <span class="cp-code">${cp.code}</span>
        <span class="cp-name">${cp.name}</span>
        <span class="cp-km">${cp.km} km</span>
      </button>`
    ).join("");

    els.manualCp.innerHTML = CHECKPOINTS.map(
      (cp) => `<option value="${cp.id}">${cp.code} · ${cp.name}</option>`
    ).join("");
  }

  function renderTable() {
    const thead = els.paceTable.querySelector("thead");
    const tbody = els.paceTable.querySelector("tbody");
    thead.innerHTML = `<tr><th>檢查站</th>${TARGETS.map(
      (g) => `<th class="${g === 18 ? "highlight" : ""}">${g}h</th>`
    ).join("")}</tr>`;

    tbody.innerHTML = CHECKPOINTS.map((cp) => {
      const times = TIMETABLE[cp.key];
      return `<tr>
        <td>${cp.code}<br/><small style="color:var(--muted)">${cp.km}km</small></td>
        ${times
          .map((m, i) => {
            const cls = TARGETS[i] === 18 ? "highlight" : "";
            return `<td class="${cls}">
              <span class="cell-elapsed">${minutesToShort(m)}</span>
              <span class="cell-eta">${formatEtaClock(m)}</span>
            </td>`;
          })
          .join("")}
      </tr>`;
    }).join("");
  }

  function setActiveButton(id) {
    els.cpGrid.querySelectorAll(".cp-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.id === id);
    });
  }

  function showResult(cp, arrival, startOverride = null) {
    const start = startOverride || raceStartDate();
    const elapsed = elapsedMinutes(arrival, start);
    const analysis = analyzePace(cp, elapsed);
    const pct = Math.min(100, (cp.km / TOTAL_KM) * 100);
    const left = Math.max(0, TOTAL_KM - cp.km);

    els.result.hidden = false;
    els.resultCpLabel.textContent = cp.code;
    els.resultTitle.textContent = cp.name;
    els.startTime.textContent = formatDateTime(start);
    els.arrivalTime.textContent = formatDateTime(arrival);
    els.elapsedTime.textContent =
      elapsed < 0
        ? `出發前 ${minutesToLabel(-elapsed)}`
        : minutesToLabel(elapsed);

    els.kmDone.textContent = cp.km % 1 === 0 ? String(cp.km) : cp.km.toFixed(1);
    els.kmLeft.textContent = left % 1 === 0 ? String(left) : left.toFixed(1);
    els.pctDone.textContent = `${pct.toFixed(0)}%`;
    els.kmProgress.style.strokeDasharray = String(RING);
    els.kmProgress.style.strokeDashoffset = String(RING * (1 - pct / 100));

    els.paceHeadline.textContent = analysis.headline;
    els.paceDetail.innerHTML = analysis.detail;
    els.paceNext.innerHTML = analysis.nextHtml;

    els.bracketList.innerHTML = analysis.rows
      .map((row) => {
        const fast = row.delta <= 0;
        const label = fast
          ? `快 ${minutesToLabel(-row.delta)}`
          : `慢 ${minutesToLabel(row.delta)}`;
        const hit =
          analysis.status === "between" || analysis.status === "on"
            ? row.goal === analysis.lower.goal || row.goal === analysis.upper.goal
            : row.goal === analysis.hitGoal;
        return `<div class="bracket-row ${hit ? "hit" : ""}">
          <span class="goal">${row.goal}h</span>
          <span class="target">參考 ${minutesToShort(row.targetMin)} · ${formatEtaClock(row.targetMin)}</span>
          <span class="delta ${fast ? "fast" : "slow"}">${label}</span>
        </div>`;
      })
      .join("");

    setActiveButton(cp.id);
    try {
      localStorage.setItem(
        "trailwalker-last",
        JSON.stringify({
          id: cp.id,
          arrival: arrival.toISOString(),
          start: start.toISOString(),
        })
      );
    } catch (_) {
      /* ignore */
    }

    els.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function fillRaceDefaults() {
    const start = raceStartDate();
    els.manualStart.value = toDatetimeLocalValue(start);
    // Default arrival: race start + 10h for a mid-pack feel
    els.manualTime.value = toDatetimeLocalValue(addMinutes(start, 600));
  }

  function applyPreset(name) {
    const start = raceStartDate();
    const presets = {
      "18h-cp5": { id: "cp5", minutes: 614 },
      "15h-cp3": { id: "cp3", minutes: 315 },
      "25h-cp7": { id: "cp7", minutes: 1050 },
    };
    const preset = presets[name];
    if (!preset) return;
    els.manualCp.value = preset.id;
    els.manualStart.value = toDatetimeLocalValue(start);
    els.manualTime.value = toDatetimeLocalValue(addMinutes(start, preset.minutes));
    const cp = CHECKPOINTS.find((c) => c.id === preset.id);
    showResult(cp, addMinutes(start, preset.minutes), start);
  }

  function clearResult() {
    els.result.hidden = true;
    setActiveButton(null);
    try {
      localStorage.removeItem("trailwalker-last");
    } catch (_) {
      /* ignore */
    }
  }

  function tickClock() {
    els.liveClock.textContent = formatClock(new Date());
  }

  function toDatetimeLocalValue(date) {
    // Show HK wall time in the input
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  }

  function parseDatetimeLocalAsHKT(value) {
    // Treat the typed wall time as Hong Kong time
    if (!value) return null;
    return new Date(`${value}:00+08:00`);
  }

  function restoreLast() {
    try {
      const raw = localStorage.getItem("trailwalker-last");
      if (!raw) return;
      const data = JSON.parse(raw);
      const cp = CHECKPOINTS.find((c) => c.id === data.id);
      if (!cp || !data.arrival) return;
      const start = data.start ? new Date(data.start) : raceStartDate();
      showResult(cp, new Date(data.arrival), start);
    } catch (_) {
      /* ignore */
    }
  }

  // Init
  renderCheckpoints();
  renderTable();
  tickClock();
  setInterval(tickClock, 1000);

  fillRaceDefaults();
  // Prefer a realistic demo arrival on first load if nothing stored
  if (!localStorage.getItem("trailwalker-last")) {
    els.manualCp.value = "cp5";
    els.manualTime.value = toDatetimeLocalValue(addMinutes(raceStartDate(), 614));
  }

  els.cpGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".cp-btn");
    if (!btn) return;
    const cp = CHECKPOINTS.find((c) => c.id === btn.dataset.id);
    if (!cp) return;
    showResult(cp, new Date(), raceStartDate());
  });

  els.clearBtn.addEventListener("click", clearResult);

  els.fillRaceDefault.addEventListener("click", () => {
    fillRaceDefaults();
  });

  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

  els.manualSubmit.addEventListener("click", () => {
    const cp = CHECKPOINTS.find((c) => c.id === els.manualCp.value);
    const start = parseDatetimeLocalAsHKT(els.manualStart.value);
    const arrival = parseDatetimeLocalAsHKT(els.manualTime.value);
    if (!cp || !start || !arrival || Number.isNaN(start.getTime()) || Number.isNaN(arrival.getTime())) {
      alert("請選擇檢查站，並輸入有效嘅出發同到達時間");
      return;
    }
    if (arrival.getTime() < start.getTime()) {
      alert("到達時間唔可以早過出發時間");
      return;
    }
    showResult(cp, arrival, start);
  });

  restoreLast();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* offline cache optional */
    });
  }
})();
