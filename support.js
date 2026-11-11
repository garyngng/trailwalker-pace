(() => {
  const S = window.TrailwalkerShared;
  const route = S.buildRoutePoints();

  const els = {
    liveClock: document.getElementById("liveClock"),
    pointSelect: document.getElementById("pointSelect"),
    lookupBtn: document.getElementById("lookupBtn"),
    result: document.getElementById("result"),
    resultKind: document.getElementById("resultKind"),
    resultTitle: document.getElementById("resultTitle"),
    resultMeta: document.getElementById("resultMeta"),
    resultNote: document.getElementById("resultNote"),
    bracketList: document.getElementById("bracketList"),
    clearBtn: document.getElementById("clearBtn"),
    paceTable: document.getElementById("paceTable"),
    liveGrid: document.getElementById("liveGrid"),
  };

  function fillSelect() {
    els.pointSelect.innerHTML = route
      .map((p, i) => {
        const tag = p.kind === "support" ? "支援" : p.code;
        return `<option value="${i}">${tag} · ${p.name}（累積 ${p.km} km）</option>`;
      })
      .join("");
  }

  function renderTable() {
    const thead = els.paceTable.querySelector("thead");
    const tbody = els.paceTable.querySelector("tbody");
    thead.innerHTML = `<tr><th>位置</th>${S.TARGETS.map(
      (g) => `<th>${g}h</th>`
    ).join("")}</tr>`;

    tbody.innerHTML = route
      .map((point, index) => {
        const legKm = S.legKmFromRoute(route, index);
        const rowClass = point.kind === "support" ? "support-row" : "";
        const label =
          point.kind === "support"
            ? `${point.name}<br/><small style="color:var(--sand)">支援點 · 呢段 ${legKm} km · 累積 ${point.km} km</small>`
            : `${point.code} · ${point.name}<br/><small style="color:var(--muted)">呢段 ${legKm} km · 累積 ${point.km} km</small>`;

        return `<tr class="${rowClass}" data-index="${index}">
          <td>${label}</td>
          ${point.times
            .map((cum, i) => {
              const leg = S.segmentMinutesFromRoute(route, index, i);
              return `<td>
                <span class="cell-elapsed">${S.minutesOnlyLabel(leg)}</span>
                <span class="cell-eta">${S.formatEtaClock(cum)}</span>
              </td>`;
            })
            .join("")}
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        const idx = Number(tr.dataset.index);
        els.pointSelect.value = String(idx);
        showPoint(idx);
      });
    });
  }

  function showPoint(index) {
    const point = route[index];
    if (!point) return;
    const legKm = S.legKmFromRoute(route, index);
    const prevName = index === 0 ? "起點" : route[index - 1].name;

    els.result.hidden = false;
    els.resultKind.textContent = point.kind === "support" ? "支援點（距離插值）" : "正式檢查站";
    els.resultTitle.textContent = point.name;
    els.resultMeta.textContent = `由「${prevName}」起呢段 ${legKm} km · 累積 ${point.km} km`;
    els.resultNote.textContent =
      point.kind === "support"
        ? point.note || "時間以鄰近正式 CP 距離比例推算，只供支援參考。"
        : "正式檢查站時間取自參考時間表。";

    els.bracketList.innerHTML = S.TARGETS.map((goal, i) => {
      const leg = S.segmentMinutesFromRoute(route, index, i);
      const cum = point.times[i];
      return `<div class="bracket-row ${goal === 22 ? "hit" : ""}">
        <span class="goal">${goal}h</span>
        <span class="target">呢段 ${S.minutesOnlyLabel(leg)} · 到站 ${S.formatEtaClock(cum)}</span>
        <span class="delta">${cum}′ 累積</span>
      </div>`;
    }).join("");

    els.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function findPointForElapsed(elapsedMin, targetIndex) {
    let current = { name: "起點／未出發", km: 0 };
    for (const point of route) {
      if (elapsedMin >= point.times[targetIndex]) {
        current = point;
      } else {
        break;
      }
    }
    return current;
  }

  function renderLiveBoard() {
    const elapsed = S.elapsedMinutesNow();
    els.liveGrid.innerHTML = S.TARGETS.map((goal, i) => {
      let body;
      if (elapsed < 0) {
        body = `距離出發仲有 ${S.minutesOnlyLabel(-elapsed)}`;
      } else {
        const at = findPointForElapsed(elapsed, i);
        const next = route.find((p) => p.times[i] > elapsed);
        if (!next) {
          body = `應已完賽（最後通過：${at.name}）`;
        } else if (at.km === 0 && elapsed < route[0].times[i]) {
          body = `應喺往 ${route[0].name} 途中<br/><small>預計到站 ${S.formatEtaClock(route[0].times[i])}</small>`;
        } else {
          body = `已過：${at.name}<br/>下一站：${next.name}<br/><small>預計到站 ${S.formatEtaClock(next.times[i])}</small>`;
        }
      }
      return `<div class="live-card ${goal === 22 ? "hot" : ""}">
        <p class="live-goal">${goal} 小時目標</p>
        <div class="live-body">${body}</div>
      </div>`;
    }).join("");
  }

  function tick() {
    els.liveClock.textContent = S.formatClock(new Date());
    renderLiveBoard();
  }

  fillSelect();
  renderTable();
  tick();
  setInterval(tick, 1000);

  els.lookupBtn.addEventListener("click", () => {
    showPoint(Number(els.pointSelect.value));
  });

  els.clearBtn.addEventListener("click", () => {
    els.result.hidden = true;
  });

  // Default: show first support waypoint
  const firstSupport = route.findIndex((p) => p.kind === "support");
  if (firstSupport >= 0) {
    els.pointSelect.value = String(firstSupport);
  }
})();
