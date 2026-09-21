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

  const leadersList = window.fibregems_portal_data?.teamLeadersList || [];

  // Populate Team Leaders Dropdown
  const leaderSelect = document.getElementById("obj-leader");
  if (leaderSelect) {
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
  if (mapInstance) updateMapMarkers(allAgentData, allLeaderData);
  initMap();

  // Tab 2: Objectives & Team Leaders List
  renderAdminObjectives(allObjectives);
  renderAdminTLList(leadersList);

  // Tab 3: Stats
  renderStatsTab(allAgentData, allLeaderData, allAgentStats);
}

// ════ MAP ════
function initMap() {
  if (!mapInstance) {
    mapInstance = L.map("map", { zIndex: 1 }).setView([-26.15, 27.87], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© OpenStreetMap",
    }).addTo(mapInstance);
    markerLayer = L.layerGroup().addTo(mapInstance);
    updateMapMarkers(allAgentData, allLeaderData);
  } else {
    mapInstance.invalidateSize();
    setTimeout(() => { 
      if (mapInstance) {
        mapInstance.invalidateSize(); 
        updateMapMarkers(allAgentData, allLeaderData);
      }
    }, 150);
  }
}

function updateMapMarkers(agents, leaders) {
  if (!mapInstance || !markerLayer) return;
  markerLayer.clearLayers();

  const allPoints = [];

  // 1. Process Agents (prefer today's check-ins, fallback to all)
  const agentList = (agents || []).filter(a => a.gps && a.gps !== "Auto-captured");
  agentList.forEach(a => {
    const coords = parseGPS(a.gps);
    if (coords) {
      allPoints.push({
        type: "agent",
        name: a.agentName || "Agent",
        leader: a.leaderName || "",
        location: a.location || a.notes || "Field Area",
        time: a.time,
        date: a.date,
        isLate: a.isLate === "Yes",
        photoUrl: a.photoUrl,
        gps: coords,
        notes: a.notes || ""
      });
    }
  });

  // 2. Process Leaders
  const leaderList = (leaders || []).filter(l => l.gps && l.gps !== "Auto-captured");
  leaderList.forEach(l => {
    const coords = parseGPS(l.gps);
    if (coords) {
      allPoints.push({
        type: "leader",
        name: l.leaderName || "Team Leader",
        leader: l.leaderName || "",
        location: l.region || l.location || "Region",
        time: l.time,
        date: l.date,
        isLate: false,
        photoUrl: l.photoUrl || l.vehicleInfo,
        gps: coords,
        notes: l.vehicleInfo ? "Vehicle verified" : ""
      });
    }
  });

  if (allPoints.length === 0) return;

  // 3. Group by location coordinates (~10 meters bucket) to prevent marker/name overlap
  const coordBuckets = {};
  allPoints.forEach(p => {
    const key = `${p.gps[0].toFixed(4)}_${p.gps[1].toFixed(4)}`;
    if (!coordBuckets[key]) coordBuckets[key] = [];
    coordBuckets[key].push(p);
  });

  const bounds = [];

  Object.values(coordBuckets).forEach(group => {
    const count = group.length;
    
    group.forEach((item, idx) => {
      let finalLat = item.gps[0];
      let finalLon = item.gps[1];

      // If multiple people are at the same spot, disperse them in a neat radial ring so names don't clash
      if (count > 1) {
        const angle = (2 * Math.PI / count) * idx;
        const radius = 0.00035; // ~35 meters offset
        finalLat = item.gps[0] + radius * Math.sin(angle);
        finalLon = item.gps[1] + radius * Math.cos(angle);
      }

      const markerGps = [finalLat, finalLon];
      bounds.push(markerGps);

      const isLate = item.isLate;
      const isLeader = item.type === "leader";
      const dotColor = isLate ? "#ef4444" : isLeader ? "#38bdf8" : "#f59e0b";
      const borderCol = isLate ? "#ef4444" : isLeader ? "#0284c7" : "#f59e0b";
      const glowCol = isLate ? "rgba(239,68,68,0.8)" : isLeader ? "rgba(56,189,248,0.8)" : "rgba(245,158,11,0.8)";
      
      const iconHtml = `
        <div class="neon-marker-container">
          <div class="neon-marker-pulse" style="background:${glowCol};box-shadow:0 0 16px ${dotColor},0 0 28px ${glowCol};"></div>
          <div class="neon-marker-pill" style="border-color:${borderCol};box-shadow:0 0 14px ${glowCol},0 4px 12px rgba(0,0,0,0.5);">
            <span class="neon-marker-dot" style="background:${dotColor};box-shadow:0 0 8px ${dotColor};"></span>
            <span style="letter-spacing:-0.2px;">${item.name}</span>
            ${isLeader ? `<span style="font-size:9px;color:#38bdf8;background:rgba(56,189,248,0.2);padding:1px 5px;border-radius:10px;font-weight:800;">TL</span>` : ''}
            ${isLate ? `<span style="font-size:9px;color:#f87171;background:rgba(239,68,68,0.2);padding:1px 5px;border-radius:10px;font-weight:800;">LATE</span>` : ''}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: "neon-marker-wrapper",
        html: iconHtml,
        iconAnchor: [0, 0],
      });

      const popupHtml = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:180px;padding:2px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <b style="font-size:13px;color:#0f172a;">${item.name}</b>
            <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;background:${isLeader ? '#e0f2fe;color:#0369a1' : '#fef3c7;color:#92400e'}">
              ${isLeader ? 'Team Leader' : 'Agent'}
            </span>
          </div>
          ${item.leader && !isLeader ? `<div style="font-size:11px;color:#64748b;margin-bottom:3px;">Leader: <b>${item.leader}</b></div>` : ''}
          <div style="font-size:11px;color:#475569;margin-bottom:3px;">📍 ${item.location}</div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">🕒 ${formatSheetDate(item.date)} at ${formatSheetTime(item.time)}</div>
          ${count > 1 ? `<div style="font-size:10px;color:#0284c7;background:#f0f9ff;padding:3px 6px;border-radius:6px;margin-bottom:6px;font-weight:600;">👥 ${count} team members at this hub</div>` : ''}
          ${item.photoUrl ? `<div style="margin-top:6px;text-align:center;"><img src="${item.photoUrl}" style="max-height:80px;border-radius:8px;border:1px solid #e2e8f0;display:inline-block;cursor:pointer;" onclick="openLightbox('${item.photoUrl}')"/></div>` : ''}
        </div>
      `;

      L.marker(markerGps, { icon }).addTo(markerLayer).bindPopup(popupHtml);
    });
  });

  if (bounds.length > 0 && mapInstance) {
    try {
      mapInstance.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 15 });
    } catch (e) {}
  }
}

// ════ TAB 1: TABLES ════
function renderAgentTable(filter) {
  agentFilter = filter;
  const tbody = document.getElementById("admin-agents-tbody");
  document.querySelectorAll("#agent-filter-tabs .filter-btn").forEach(b => {
    b.className = b.dataset.filter === filter
      ? "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-[#f59e0b] text-[#0f172a] transition"
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
      ? "filter-btn text-[11px] px-3 py-1 rounded-lg font-semibold bg-[#f59e0b] text-[#0f172a] transition"
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
          ${o.targetHouses ? `<p class="text-[11px] font-semibold text-amber-700 mt-0.5">🏠 Target: ${o.targetHouses} houses</p>` : ''}
          ${o.targetMetrics ? `<p class="text-[11px] text-gray-500 mt-0.5">Metrics: ${o.targetMetrics}</p>` : ''}
          <div class="flex gap-2 mt-3">
            <button onclick="handleApproveObjective(${o.rowIndex}, 'Published')" class="flex-1 bg-emerald-600 text-white text-[11px] font-bold py-2 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-1 shadow-sm">
              ✓ Approve &amp; Publish
            </button>
            <button onclick="handleApproveObjective(${o.rowIndex}, 'Rejected')" class="flex-1 bg-red-500 text-white text-[11px] font-bold py-2 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-1 shadow-sm">
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
          ${o.targetHouses ? `<p class="text-[11px] font-semibold text-amber-700 mt-0.5">🏠 Target: ${o.targetHouses} houses</p>` : ''}
          ${o.targetMetrics ? `<p class="text-[11px] text-gray-500 mt-0.5">Metrics: ${o.targetMetrics}</p>` : ''}
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
  const targetHouses = document.getElementById("obj-target-houses")?.value.trim() || "";

  if (!targetDate) { showToast("Select a target date.", "warning"); return; }

  const res = await setWeeklyObjective({
    viewType, targetDate, leaderName, assignedLocation,
    focusAreas, targetMetrics: targetMetrics || "Active Sales",
    targetHouses,
    status: "Published", requestedBy: "Admin",
  });
  if (res && res.status === "success") {
    showToast(`${viewType} objective published! ✓`, "success");
    ["obj-leader", "obj-location", "obj-focus", "obj-metrics", "obj-target-houses"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
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

// ════ TEAM LEADER MANAGEMENT & DELETION ════
function renderAdminTLList(list) {
  const container = document.getElementById("admin-tl-list");
  const countBadge = document.getElementById("admin-tl-count");
  if (!container) return;

  const leaders = list || [];
  if (countBadge) countBadge.textContent = `${leaders.length} leader${leaders.length === 1 ? '' : 's'}`;

  if (leaders.length === 0) {
    container.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-4">No team leaders registered yet.</p>`;
    return;
  }

  container.innerHTML = leaders.map(tl => {
    const name = tl.fullName || `${tl.firstName || ''} ${tl.lastName || ''}`.trim() || "Team Leader";
    const email = tl.email || "";
    return `
      <div class="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition">
        <div>
          <p class="text-xs font-bold text-gray-800">${name}</p>
          <p class="text-[10px] text-gray-500">${email}</p>
        </div>
        <button onclick="deleteTeamLeader('${email}', '${name.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1" title="Delete Team Leader">
          <i data-lucide="trash-2" style="width:12px;height:12px"></i>
          <span>Delete</span>
        </button>
      </div>
    `;
  }).join("");

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function deleteTeamLeader(email, name) {
  if (!email) return;
  if (!confirm(`Are you sure you want to delete Team Leader ${name || email}? This will remove their account permanently.`)) {
    return;
  }
  showToast("Deleting team leader…", "info", 2000);
  const res = await deleteTeamLeaderAPI(email);
  if (res && res.status === "success") {
    showToast(`Team Leader ${name || email} deleted. ✓`, "success");
    fetchAllPortalData(true);
  } else {
    showToast(res?.message || "Failed to delete team leader.", "error");
  }
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
    fetchAllPortalData(true);
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
  const strikeCount = (agentStats || []).filter(s => parseInt(s.strikes || 0) > 0 || (s.issueType && s.issueType.toLowerCase().includes('strike'))).length;

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
          ${agentStats.map((s, i) => {
            const strikes = parseInt(s.strikes || 0);
            const hasKPIs = (s.engagements && s.engagements !== '0') || (s.realLeads && s.realLeads !== '0') || (s.payments && s.payments !== '0') || s.issueType === 'Daily Field KPIs';
            const issueType = s.issueType || (hasKPIs ? 'Daily Field KPIs' : strikes > 0 ? `${strikes} Strike${strikes > 1 ? 's' : ''}` : 'Performance Note');
            const isSevere = strikes >= 2 || (issueType && (issueType.includes('2') || issueType.includes('3') || issueType.toLowerCase().includes('misconduct') || issueType.toLowerCase().includes('absent')));
            const badgeClass = hasKPIs ? 'badge-ontime' : isSevere ? 'badge-strike' : strikes > 0 ? 'badge-late' : 'badge-ontime';
            const agentNameEscaped = (s.agentName || '').replace(/'/g, "\\'");

            return `
              <div class="flex items-start justify-between px-5 py-3.5 ${i % 2 ? 'stat-row-alt' : ''}">
                <div class="pr-2 flex-grow">
                  <div class="flex items-center gap-2">
                    <p class="text-[12px] font-bold text-gray-800">${s.agentName || '—'}</p>
                    ${s.leaderName ? `<span class="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Logged by: ${s.leaderName}</span>` : ''}
                  </div>
                  <p class="text-[10px] text-gray-400 mt-0.5">${formatSheetDate(s.date)} ${s.time ? `· ${formatSheetTime(s.time)}` : ''}</p>
                  ${hasKPIs ? `
                    <div class="flex flex-wrap gap-1.5 mt-1">
                      <span class="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
                        👥 ${s.engagements || 0} Engagements
                      </span>
                      <span class="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                        🎯 ${s.realLeads || 0} Leads
                      </span>
                      <span class="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100">
                        💳 ${s.payments || 0} Payments
                      </span>
                    </div>
                  ` : ''}
                  <p class="text-[11px] text-gray-600 mt-1">${s.notes || s.issueType || '—'}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="${badgeClass} text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    ${issueType}
                  </span>
                  <button onclick="deleteAgentStatRecord(${s.rowIndex || (i + 2)}, '${agentNameEscaped}')" class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition" title="Delete this record">
                    <i data-lucide="trash-2" style="width:13px;height:13px"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>`;
    }
  }

  // Manage Field Agents list
  const manageAgentsContainer = document.getElementById('stats-manage-agents');
  if (manageAgentsContainer) {
    const allKnownAgents = [...new Set([
      ...(agents || []).map(a => a.agentName),
      ...(agentStats || []).map(s => s.agentName)
    ].filter(Boolean))];

    if (allKnownAgents.length === 0) {
      manageAgentsContainer.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-6">No active agents recorded yet.</p>`;
    } else {
      manageAgentsContainer.innerHTML = `
        <div class="divide-y divide-gray-50">
          ${allKnownAgents.map((agentName, i) => {
            const agentRecords = (agentStats || []).filter(s => s.agentName === agentName);
            const totalStrikes = agentRecords.reduce((sum, r) => sum + (parseInt(r.strikes) || (r.issueType && r.issueType.toLowerCase().includes('strike') ? 1 : 0)), 0);
            const totalEngagements = agentRecords.reduce((sum, r) => sum + (parseInt(r.engagements) || 0), 0);
            const totalLeads = agentRecords.reduce((sum, r) => sum + (parseInt(r.realLeads) || 0), 0);
            const totalPayments = agentRecords.reduce((sum, r) => sum + (parseInt(r.payments) || 0), 0);
            const signOnCount = (agents || []).filter(a => a.agentName === agentName).length;
            const agentNameEscaped = agentName.replace(/'/g, "\\'");

            return `
              <div class="flex items-center justify-between px-5 py-3 ${i % 2 ? 'stat-row-alt' : ''}">
                <div>
                  <p class="text-[12px] font-bold text-gray-800">${agentName}</p>
                  <p class="text-[10px] text-gray-400">
                    Sign-ons: <b class="text-slate-600">${signOnCount}</b> · Strikes: <b class="${totalStrikes > 0 ? 'text-rose-600' : 'text-emerald-600'}">${totalStrikes}</b> · Total Leads: <b class="text-blue-600">${totalLeads}</b> · Payments: <b class="text-purple-600">${totalPayments}</b>
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  ${agentRecords.length > 0 ? `
                    <button onclick="clearAgentAllRecords('${agentNameEscaped}')" class="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1">
                      <i data-lucide="trash-2" style="width:11px;height:11px"></i>
                      <span>Clear Records</span>
                    </button>
                  ` : `
                    <span class="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Clean Record</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
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

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function deleteAgentStatRecord(rowIndex, agentName) {
  if (!confirm(`Are you sure you want to delete this performance record for ${agentName || 'Agent'}?`)) {
    return;
  }
  showToast("Deleting performance record…", "info", 2000);
  const res = await deleteAgentStatAPI({ rowIndex, agentName });
  if (res && res.status === "success") {
    showToast(`Record for ${agentName || 'Agent'} deleted. ✓`, "success");
    fetchAllPortalData(true);
  } else {
    showToast(res?.message || "Failed to delete record.", "error");
  }
}

async function clearAgentAllRecords(agentName) {
  if (!agentName) return;
  if (!confirm(`Are you sure you want to clear ALL performance records & strikes for ${agentName}? This cannot be undone.`)) {
    return;
  }
  showToast(`Clearing all records for ${agentName}…`, "info", 2000);
  const res = await deleteAgentStatAPI({ agentName, clearAll: true });
  if (res && res.status === "success") {
    showToast(`All records for ${agentName} cleared. ✓`, "success");
    fetchAllPortalData(true);
  } else {
    showToast(res?.message || "Failed to clear records.", "error");
  }
}