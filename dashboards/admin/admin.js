// ════ ADMIN DASHBOARD LOGIC ════

let mapInstance = null, markerLayer = null;
let allAgentData = [], allLeaderData = [], allObjectives = [], allAgentStats = [];
let agentFilter = "today", leaderFilter = "today";

// Check authentication on load
window.addEventListener('DOMContentLoaded', () => {
  const session = checkSession();
  if (session) {
    initializeDashboardData();
    setupAdminCalendar();
  }
});

// ════ CALENDAR DYNAMIC TYPE & MIN DATE ════
function setupAdminCalendar() {
  const typeSelect = document.getElementById("calendar-view-type");
  const dateInput = document.getElementById("calendar-target-date");
  if (!typeSelect || !dateInput) return;

  function updateCalendarInput() {
    const viewType = typeSelect.value;
    const now = new Date();
    
    if (viewType === "Day") {
      dateInput.type = "date";
      dateInput.min = now.toISOString().split("T")[0];
      if (!dateInput.value || dateInput.value < dateInput.min) dateInput.value = dateInput.min;
    } 
    else if (viewType === "Week") {
      dateInput.type = "week";
      // Format YYYY-Www
      const year = now.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const weekStr = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
      dateInput.min = weekStr;
      if (!dateInput.value || dateInput.value < weekStr) dateInput.value = weekStr;
    } 
    else if (viewType === "Month") {
      dateInput.type = "month";
      const monthStr = now.toISOString().split("T")[0].substring(0, 7); // YYYY-MM
      dateInput.min = monthStr;
      if (!dateInput.value || dateInput.value < monthStr) dateInput.value = monthStr;
    }
  }

  typeSelect.addEventListener("change", updateCalendarInput);
  updateCalendarInput(); // initialize
}

// ════ TAB SWITCHING ════
function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`nav-${tabName}`).classList.add('active');
  // Invalidate map size when switching back to login tab
  if (tabName === 'login' && mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 100);
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ════ DATA LOADING ════
function initializeDashboardData() {
  const cached = localStorage.getItem("fibregems_portal_data");
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      applyPortalData(parsed.agents || [], parsed.leaders || [], parsed.objectives || [], parsed.agentStats || []);
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
      const data = {
        agents: res.agents || [],
        leaders: res.leaders || [],
        objectives: res.objectives || [],
        agentStats: res.agentStats || [],
        teamLeadersList: res.teamLeadersList || [],
      };
      // Keep in window for access
      window.fibregems_portal_data = data;
      localStorage.setItem("fibregems_portal_data", JSON.stringify(data));
      applyPortalData(data.agents, data.leaders, data.objectives, data.agentStats);
      if (!isBackground) showToast("Data refreshed! ✓", "success");
    } else if (!isBackground) {
      showToast(res?.message || "Failed to fetch data.", "error");
    }
  } catch (err) {
    if (!isBackground && btn) {
      btn.disabled = false;
      btn.classList.remove("opacity-70");
      if (icon) icon.classList.remove("animate-spin");
      showToast("Connection error.", "error");
    }
  } finally {
    hideLoader();
  }
}

function applyPortalData(agents, leaders, objectives, agentStats) {
  allAgentData = agents || [];
  allLeaderData = leaders || [];
  allObjectives = objectives || [];
  allAgentStats = agentStats || [];

  // Populate Team Leaders Dropdown
  const leaderSelect = document.getElementById("obj-leader");
  if (leaderSelect) {
    // Attempt to use teamLeadersList if Apps Script returns it, otherwise fallback to unique names from check-ins
    const leadersList = window.fibregems_portal_data?.teamLeadersList || [];
    let leaderNames = [];
    
    if (leadersList.length > 0) {
      leaderNames = leadersList.map(l => l.fullName || `${l.firstName} ${l.lastName}`.trim());
    } else {
      leaderNames = [...new Set(allLeaderData.map(l => l.leaderName).filter(Boolean))];
    }
    
    const currentVal = leaderSelect.value;
    leaderSelect.innerHTML = `<option value="">All Teams (Leave blank for all)</option>`;
    leaderNames.forEach(name => {
      leaderSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
    if (currentVal) leaderSelect.value = currentVal;
  }

  // Tab 1: Login activity
  const elAgents = document.getElementById("kpi-agents");
  const elLeaders = document.getElementById("kpi-leaders");
  const elLate = document.getElementById("kpi-late");
  if (elAgents) elAgents.textContent = allAgentData.length;
  if (elLeaders) elLeaders.textContent = allLeaderData.length;
  if (elLate) elLate.textContent = allAgentData.filter(a => a.isLate === "Yes").length;
  renderAgentTable(agentFilter);
  renderLeaderTable(leaderFilter);
  if (mapInstance) updateMapMarkers(allLeaderData);
  initMap();

  // Tab 2: Objectives
  renderAdminObjectives(allObjectives);

  // Tab 3: Stats
  renderStatsTab(allAgentData, allLeaderData, allAgentStats);
}

// ════ MAP ════
function initMap() {
  if (!mapInstance) {
    mapInstance = L.map("map", { zIndex: 1 }).setView([-26.15, 27.87], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© OpenStreetMap",
    }).addTo(mapInstance);
    markerLayer = L.layerGroup().addTo(mapInstance);
    if (allLeaderData.length > 0) updateMapMarkers(allLeaderData);
  } else {
    mapInstance.invalidateSize();
    setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 150);
  }
}

function updateMapMarkers(leaders) {
  if (!mapInstance || !markerLayer) return;
  markerLayer.clearLayers();
  leaders.forEach(l => {
    const gps = parseGPS(l.gps);
    if (!gps) return;
    const icon = L.divIcon({
      className: "",
      html: `<div style="background:#0b5345;color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:20px;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,.3);">📍 ${l.leaderName || "Leader"}</div>`,
      iconAnchor: [0, 0],
    });
    L.marker(gps, { icon }).addTo(markerLayer)
      .bindPopup(`<b>${l.leaderName}</b><br>Region: ${l.region}<br>Time: ${formatSheetTime(l.time)}`);
  });
}

// ════ TAB 1: TABLES ════
function renderAgentTable(filter) {
  agentFilter = filter;
  const tbody = document.getElementById("admin-agents-tbody");
  document.querySelectorAll("#agent-filter-tabs .filter-btn").forEach(b => {
    b.className = b.dataset.filter === filter
      ? "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-[#0b5345] text-white transition"
      : "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-gray-100 text-gray-600 transition";
  });
  const rows = filter === "today" ? allAgentData.filter(a => isToday(a.date)) : allAgentData;
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-3 py-8 text-center text-gray-400 text-xs">No agent records found${filter === "today" ? " for today" : ""}.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((a, i) =>
    `<tr class="border-b border-gray-50 hover:bg-gray-50/60 transition ${i % 2 ? "bg-gray-50/25" : ""}">
      <td class="px-3 py-3 text-gray-500 whitespace-nowrap">${formatSheetDate(a.date)}<br><span class="text-gray-400">${formatSheetTime(a.time)}</span></td>
      <td class="px-3 py-3 font-semibold">${a.agentName || "—"}</td>
      <td class="px-3 py-3 text-gray-600">${a.leaderName || "—"}</td>
      <td class="px-3 py-3 text-gray-600">${a.location || "—"}</td>
      <td class="px-3 py-3 text-gray-500 text-[10px]">${a.gps || "—"}<br><span class="text-[9px] text-emerald-600">${a.notes || ""}</span></td>
      <td class="px-3 py-3">${a.isLate === "Yes" ? `<span class="badge-late text-[10px] font-bold px-2 py-0.5 rounded-full">Late</span>` : `<span class="badge-ontime text-[10px] font-bold px-2 py-0.5 rounded-full">On Time</span>`}</td>
      <td class="px-3 py-3">${photoCell(a.photoUrl, "Agent selfie")}</td>
    </tr>`
  ).join("");
}

function renderLeaderTable(filter) {
  leaderFilter = filter;
  const tbody = document.getElementById("admin-leaders-tbody");
  document.querySelectorAll("#leader-filter-tabs .filter-btn").forEach(b => {
    b.className = b.dataset.filter === filter
      ? "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-[#0b5345] text-white transition"
      : "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-gray-100 text-gray-600 transition";
  });
  const rows = filter === "today" ? allLeaderData.filter(l => isToday(l.date)) : allLeaderData;
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-3 py-8 text-center text-gray-400 text-xs">No leader records found${filter === "today" ? " for today" : ""}.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((l, i) =>
    `<tr class="border-b border-gray-50 hover:bg-gray-50/60 transition ${i % 2 ? "bg-gray-50/25" : ""}">
      <td class="px-3 py-3 text-gray-500 whitespace-nowrap">${formatSheetDate(l.date)}<br><span class="text-gray-400">${formatSheetTime(l.time)}</span></td>
      <td class="px-3 py-3 font-semibold">${l.leaderName || "—"}</td>
      <td class="px-3 py-3 text-gray-600">${l.region || "—"}</td>
      <td class="px-3 py-3 text-gray-500 text-[10px]">${l.gps || "—"}</td>
      <td class="px-3 py-3">${photoCell(l.vehicleInfo, "Vehicle photo")}</td>
      <td class="px-3 py-3">${photoCell(l.photoUrl, "Leader selfie")}</td>
    </tr>`
  ).join("");
}

function filterTable(type, filter) {
  if (type === "agent") renderAgentTable(filter);
  else renderLeaderTable(filter);
}

// ════ TAB 2: OBJECTIVES ════
function renderAdminObjectives(objectives) {
  const pending = (objectives || []).filter(o => o.status === 'Pending');
  const published = (objectives || []).filter(o => o.status === 'Published' || !o.status);

  // Pending counter badge
  const badge = document.getElementById('pending-count');
  if (badge) badge.textContent = `${pending.length} pending`;

  // Render pending
  const pendingContainer = document.getElementById('admin-pending-objectives');
  if (pendingContainer) {
    if (pending.length === 0) {
      pendingContainer.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-4">No pending requests from leaders.</p>`;
    } else {
      pendingContainer.innerHTML = pending.map((o, idx) => `
        <div class="objective-card mb-3">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <p class="text-[11px] font-bold text-gray-800">Requested by: ${o.requestedBy || o.leaderName || '—'}</p>
              <p class="text-[10px] text-gray-400 mt-0.5">Target: ${o.targetDate ? formatSheetDate(o.targetDate) : '—'} · ${o.viewType || 'Weekly'}</p>
            </div>
            <span class="obj-badge pending">Pending</span>
          </div>
          ${o.assignedLocation ? `<p class="text-[11px] text-gray-600 mb-1">📍 ${o.assignedLocation}</p>` : ''}
          ${o.focusAreas ? `<p class="text-[11px] font-semibold text-emerald-700">🎯 ${o.focusAreas}</p>` : ''}
          ${o.targetMetrics ? `<p class="text-[11px] text-gray-500 mt-0.5">Target: ${o.targetMetrics}</p>` : ''}
          <div class="flex gap-2 mt-3">
            <button onclick="handleApproveObjective(${o.rowIndex}, 'Published')" class="flex-1 bg-emerald-600 text-white text-[11px] font-bold py-2 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-1">
              ✓ Approve &amp; Publish
            </button>
            <button onclick="handleApproveObjective(${o.rowIndex}, 'Rejected')" class="flex-1 bg-red-500 text-white text-[11px] font-bold py-2 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-1">
              ✕ Reject
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  // Render published list
  const listContainer = document.getElementById('admin-objectives-list');
  if (listContainer) {
    if (published.length === 0) {
      listContainer.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-4">No objectives published yet. Use the form above to publish one.</p>`;
    } else {
      listContainer.innerHTML = published.map(o => `
        <div class="objective-card">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <p class="text-[11px] font-bold text-gray-800">${o.leaderName ? `Leader: ${o.leaderName}` : 'All Teams'}</p>
              <p class="text-[10px] text-gray-400 mt-0.5">Target: ${o.targetDate ? formatSheetDate(o.targetDate) : '—'} · ${o.viewType || 'Weekly'}</p>
            </div>
            <span class="obj-badge published">${o.viewType || 'Weekly'}</span>
          </div>
          ${o.assignedLocation ? `<p class="text-[11px] text-gray-600 mb-1">📍 ${o.assignedLocation}</p>` : ''}
          ${o.focusAreas ? `<p class="text-[11px] font-semibold text-emerald-700">🎯 ${o.focusAreas}</p>` : ''}
          ${o.targetMetrics ? `<p class="text-[11px] text-gray-500 mt-0.5">Target: ${o.targetMetrics}</p>` : ''}
        </div>
      `).join('');
    }
  }
}

async function submitWeeklyObjective() {
  const viewType = document.getElementById("calendar-view-type").value;
  const targetDate = document.getElementById("calendar-target-date").value;
  const leaderName = document.getElementById("obj-leader").value.trim();
  const assignedLocation = document.getElementById("obj-location").value.trim();
  const focusAreas = document.getElementById("obj-focus").value.trim();
  const targetMetrics = document.getElementById("obj-metrics").value.trim();

  if (!targetDate) { showToast("Select a target date.", "warning"); return; }

  const res = await setWeeklyObjective({
    viewType, targetDate, leaderName, assignedLocation,
    focusAreas, targetMetrics: targetMetrics || "Active Sales",
    status: "Published", requestedBy: "Admin",
  });
  if (res && res.status === "success") {
    showToast(`${viewType} objective published! ✓`, "success");
    ["obj-leader", "obj-location", "obj-focus", "obj-metrics"].forEach(id => (document.getElementById(id).value = ""));
    fetchAllPortalData(true);
  } else if (res) showToast(res.message || "Save failed.", "error", 6000);
}

async function handleApproveObjective(rowIndex, status) {
  const label = status === 'Published' ? 'Approving…' : 'Rejecting…';
  showToast(label, 'info', 2000);
  const res = await approveObjectiveAPI({ rowIndex, status });
  if (res && res.status === 'success') {
    showToast(status === 'Published' ? 'Objective approved &amp; published! ✓' : 'Objective rejected.', status === 'Published' ? 'success' : 'warning');
    fetchAllPortalData(true);
  } else if (res) showToast(res.message || 'Action failed.', 'error');
}

async function addTeamLeader() {
  const firstName = document.getElementById("tl-first-name").value.trim();
  const lastName = document.getElementById("tl-last-name").value.trim();
  const email = document.getElementById("tl-email").value.trim();
  const password = document.getElementById("tl-password").value;

  if (!firstName || !lastName || !email || !password) { showToast("Please fill in all fields.", "warning"); return; }
  if (!email.includes("@")) { showToast("Please enter a valid email address.", "warning"); return; }
  if (password.length < 6) { showToast("Password must be at least 6 characters.", "warning"); return; }

  const res = await addTeamLeaderAPI({ firstName, lastName, email, password, accountType: "Team Leader" });
  if (res && res.status === "success") {
    showToast(`Team Leader ${firstName} ${lastName} added! ✓`, "success");
    ["tl-first-name", "tl-last-name", "tl-email", "tl-password"].forEach(id => (document.getElementById(id).value = ""));
  } else {
    showToast(res?.message || "Failed to add team leader.", "error");
  }
}

// ════ TAB 3: STATS ════
function renderStatsTab(agents, leaders, agentStats) {
  // KPIs
  const todayAgents = (agents || []).filter(a => isToday(a.date));
  const todayLeaders = (leaders || []).filter(l => isToday(l.date));
  const lateCount = (agents || []).filter(a => isToday(a.date) && a.isLate === 'Yes').length;
  const strikeCount = (agentStats || []).filter(s => parseInt(s.strikes || 0) > 0).length;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('stats-kpi-agents', agents.length);
  el('stats-kpi-leaders', leaders.length);
  el('stats-kpi-late', lateCount);
  el('stats-kpi-strikes', strikeCount);

  // Agent performance records
  const perfContainer = document.getElementById('stats-agent-perf');
  if (perfContainer) {
    if (!agentStats || agentStats.length === 0) {
      perfContainer.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-6">No performance records logged yet.</p>`;
    } else {
      perfContainer.innerHTML = `
        <div class="divide-y divide-gray-50">
          ${agentStats.map((s, i) => `
            <div class="flex items-center justify-between px-5 py-3 ${i % 2 ? 'stat-row-alt' : ''}">
              <div>
                <p class="text-[12px] font-bold text-gray-800">${s.agentName || '—'}</p>
                <p class="text-[10px] text-gray-400">${formatSheetDate(s.date)} · ${s.notes || '—'}</p>
              </div>
              ${parseInt(s.strikes || 0) > 0
                ? `<span class="badge-late text-[10px] font-bold px-2 py-0.5 rounded-full">${s.strikes} Strike${s.strikes > 1 ? 's' : ''}</span>`
                : `<span class="badge-ontime text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>`}
            </div>
          `).join('')}
        </div>`;
    }
  }

  // Leader summary
  const leaderSummaryContainer = document.getElementById('stats-leader-summary');
  if (leaderSummaryContainer) {
    if (!leaders || leaders.length === 0) {
      leaderSummaryContainer.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-6">No leader check-ins recorded.</p>`;
    } else {
      // Group leaders by name
      const grouped = {};
      leaders.forEach(l => {
        const name = l.leaderName || 'Unknown';
        if (!grouped[name]) grouped[name] = { count: 0, lastDate: null, lastRegion: null };
        grouped[name].count++;
        if (!grouped[name].lastDate || new Date(l.date) > new Date(grouped[name].lastDate)) {
          grouped[name].lastDate = l.date;
          grouped[name].lastRegion = l.region;
        }
      });
      leaderSummaryContainer.innerHTML = `
        <div class="divide-y divide-gray-50">
          ${Object.entries(grouped).map(([name, data], i) => `
            <div class="flex items-center justify-between px-5 py-3 ${i % 2 ? 'stat-row-alt' : ''}">
              <div>
                <p class="text-[12px] font-bold text-gray-800">${name}</p>
                <p class="text-[10px] text-gray-400">Last check-in: ${data.lastDate ? formatSheetDate(data.lastDate) : '—'} · ${data.lastRegion || '—'}</p>
              </div>
              <span class="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">${data.count} check-in${data.count > 1 ? 's' : ''}</span>
            </div>
          `).join('')}
        </div>`;
    }
  }

  // Agent sign-ons by leader
  const agentsByLeaderContainer = document.getElementById('stats-agents-by-leader');
  if (agentsByLeaderContainer) {
    if (!agents || agents.length === 0) {
      agentsByLeaderContainer.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-6">No agent sign-ons recorded.</p>`;
    } else {
      const grouped = {};
      agents.forEach(a => {
        const leader = a.leaderName || 'Unknown';
        if (!grouped[leader]) grouped[leader] = { total: 0, today: 0, late: 0 };
        grouped[leader].total++;
        if (isToday(a.date)) grouped[leader].today++;
        if (a.isLate === 'Yes' && isToday(a.date)) grouped[leader].late++;
      });
      agentsByLeaderContainer.innerHTML = `
        <div class="divide-y divide-gray-50">
          ${Object.entries(grouped).map(([leader, data], i) => `
            <div class="flex items-center justify-between px-5 py-3 ${i % 2 ? 'stat-row-alt' : ''}">
              <div>
                <p class="text-[12px] font-bold text-gray-800">${leader}</p>
                <p class="text-[10px] text-gray-400">Today: ${data.today} · Late today: ${data.late} · Total: ${data.total}</p>
              </div>
              <span class="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">${data.today} today</span>
            </div>
          `).join('')}
        </div>`;
    }
  }
}