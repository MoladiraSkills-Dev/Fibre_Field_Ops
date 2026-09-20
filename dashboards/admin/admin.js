// ════ ADMIN DASHBOARD LOGIC ════

let mapInstance = null,
    markerLayer = null;
let allAgentData = [],
    allLeaderData = [];
let agentFilter = "today",
    leaderFilter = "today";

// Check authentication on load
window.addEventListener('DOMContentLoaded', () => {
  const session = checkSession();
  if (session) {
    initializeDashboardData();
  }
});

function initializeDashboardData() {
  const cached = localStorage.getItem("fibregems_portal_data");
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      applyPortalData(parsed.agents || [], parsed.leaders || []);
    } catch (e) {}
  }
  fetchAllPortalData(true);
}

async function fetchAllPortalData(isBackground = false) {
  const btn = document.getElementById("refresh-btn");
  const icon = document.getElementById("refresh-icon");
  if (!isBackground && btn) {
    btn.disabled = true;
    btn.classList.add("opacity-70");
    if (icon) icon.classList.add("animate-spin");
  }
  try {
    const res = await getSuperAdminData();
    if (!isBackground && btn) {
      btn.disabled = false;
      btn.classList.remove("opacity-70");
      if (icon) icon.classList.remove("animate-spin");
    }
    if (res && res.status === "success") {
      localStorage.setItem(
        "fibregems_portal_data",
        JSON.stringify({
          agents: res.agents || [],
          leaders: res.leaders || [],
        }),
      );
      applyPortalData(res.agents, res.leaders);
      if (!isBackground) showToast("Data refreshed! ✓", "success");
    } else if (!isBackground)
      showToast(res.message || "Failed to fetch data.", "error");
  } catch (err) {
    if (!isBackground && btn) {
      btn.disabled = false;
      btn.classList.remove("opacity-70");
      if (icon) icon.classList.remove("animate-spin");
      showToast("Connection error.", "error");
    }
  } finally {
    // Always hide loader to prevent persistent overlay
    hideLoader();
  }
}

function applyPortalData(agents, leaders) {
  allAgentData = agents || [];
  allLeaderData = leaders || [];
  const elAgents = document.getElementById("kpi-agents");
  const elLeaders = document.getElementById("kpi-leaders");
  const elLate = document.getElementById("kpi-late");
  if (elAgents) elAgents.textContent = allAgentData.length;
  if (elLeaders) elLeaders.textContent = allLeaderData.length;
  if (elLate)
    elLate.textContent = allAgentData.filter(
      (a) => a.isLate === "Yes",
    ).length;
  renderAgentTable(agentFilter);
  renderLeaderTable(leaderFilter);
  if (mapInstance) updateMapMarkers(allLeaderData);
  initMap();
}

// ════ MAP ════
function initMap() {
  if (!mapInstance) {
    mapInstance = L.map("map").setView([-26.15, 27.87], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(mapInstance);
    markerLayer = L.layerGroup().addTo(mapInstance);
    if (allLeaderData.length > 0) updateMapMarkers(allLeaderData);
  } else {
    mapInstance.invalidateSize();
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 150);
  }
}

function updateMapMarkers(leaders) {
  if (!mapInstance || !markerLayer) return;
  markerLayer.clearLayers();
  leaders.forEach((l) => {
    const gps = parseGPS(l.gps);
    if (!gps) return;
    const icon = L.divIcon({
      className: "",
      html: `<div style="background:#0b5345;color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:20px;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,.3);">📍 ${l.leaderName || "Leader"}</div>`,
      iconAnchor: [0, 0],
    });
    L.marker(gps, { icon })
      .addTo(markerLayer)
      .bindPopup(
        `<b>${l.leaderName}</b><br>Region: ${l.region}<br>Time: ${formatSheetTime(l.time)}`,
      );
  });
}

function renderAgentTable(filter) {
  agentFilter = filter;
  const tbody = document.getElementById("admin-agents-tbody");
  document
    .querySelectorAll("#agent-filter-tabs .filter-btn")
    .forEach((b) => {
      b.className =
        b.dataset.filter === filter
          ? "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-[#0b5345] text-white transition"
          : "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-gray-100 text-gray-600 transition";
    });
  const rows =
    filter === "today"
      ? allAgentData.filter((a) => isToday(a.date))
      : allAgentData;
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-3 py-8 text-center text-gray-400 text-xs">No agent records found${filter === "today" ? " for today" : ""}.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (a, i) =>
        `<tr class="border-b border-gray-50 hover:bg-gray-50/60 transition ${i % 2 ? "bg-gray-50/25" : ""}"><td class="px-3 py-3 text-gray-500 whitespace-nowrap">${formatSheetDate(a.date)}<br><span class="text-gray-400">${formatSheetTime(a.time)}</span></td><td class="px-3 py-3 font-semibold">${a.agentName || "—"}</td><td class="px-3 py-3 text-gray-600">${a.leaderName || "—"}</td><td class="px-3 py-3 text-gray-600">${a.location || "—"}</td><td class="px-3 py-3 text-gray-500 text-[10px]">${a.gps || "—"}<br><span class="text-[9px] text-emerald-600">${a.notes || ""}</span></td><td class="px-3 py-3">${a.isLate === "Yes" ? `<span class="badge-late text-[10px] font-bold px-2 py-0.5 rounded-full">Late</span>` : `<span class="badge-ontime text-[10px] font-bold px-2 py-0.5 rounded-full">On Time</span>`}</td><td class="px-3 py-3">${photoCell(a.photoUrl, "Agent selfie")}</td></tr>`,
    )
    .join("");
}

function renderLeaderTable(filter) {
  leaderFilter = filter;
  const tbody = document.getElementById("admin-leaders-tbody");
  document
    .querySelectorAll("#leader-filter-tabs .filter-btn")
    .forEach((b) => {
      b.className =
        b.dataset.filter === filter
          ? "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-[#0b5345] text-white transition"
          : "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-gray-100 text-gray-600 transition";
    });
  const rows =
    filter === "today"
      ? allLeaderData.filter((l) => isToday(l.date))
      : allLeaderData;
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-3 py-8 text-center text-gray-400 text-xs">No leader records found${filter === "today" ? " for today" : ""}.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (l, i) =>
        `<tr class="border-b border-gray-50 hover:bg-gray-50/60 transition ${i % 2 ? "bg-gray-50/25" : ""}"><td class="px-3 py-3 text-gray-500 whitespace-nowrap">${formatSheetDate(l.date)}<br><span class="text-gray-400">${formatSheetTime(l.time)}</span></td><td class="px-3 py-3 font-semibold">${l.leaderName || "—"}</td><td class="px-3 py-3 text-gray-600">${l.region || "—"}</td><td class="px-3 py-3 text-gray-500 text-[10px]">${l.gps || "—"}</td><td class="px-3 py-3">${photoCell(l.vehicleInfo, "Vehicle photo")}</td><td class="px-3 py-3">${photoCell(l.photoUrl, "Leader selfie")}</td></tr>`,
    )
    .join("");
}

function filterTable(type, filter) {
  if (type === "agent") renderAgentTable(filter);
  else renderLeaderTable(filter);
}

async function submitWeeklyObjective() {
  const viewType = document.getElementById("calendar-view-type").value;
  const targetDate = document.getElementById(
    "calendar-target-date",
  ).value;
  const leaderName = document.getElementById("obj-leader").value.trim();
  const assignedLocation = document
    .getElementById("obj-location")
    .value.trim();
  const focusAreas = document.getElementById("obj-focus").value.trim();
  if (!leaderName) {
    showToast("Enter the assigned Team Leader name.", "warning");
    return;
  }
  if (!targetDate) {
    showToast("Select a target date.", "warning");
    return;
  }
  const res = await setWeeklyObjective({
    viewType,
    targetDate,
    leaderName,
    assignedLocation,
    focusAreas,
    targetMetrics: "Active Sales",
  });
  if (res && res.status === "success") {
    showToast(`${viewType} objective published! ✓`, "success");
    ["obj-leader", "obj-location", "obj-focus"].forEach(
      (id) => (document.getElementById(id).value = ""),
    );
  } else if (res)
    showToast(res.message || "Calendar save failed.", "error", 6000);
}