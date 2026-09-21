// ════ LEADER DASHBOARD LOGIC ════

let vehiclePhotoBase64 = "";
let selfiePhotoBase64 = "";
let allLeaderPortalData = { agents: [], leaders: [], objectives: [], agentStats: [] };
let leaderSession = null;

// Photo state configuration
const photoStateMap = {
  vehicle: {
    setState: (v) => (vehiclePhotoBase64 = v),
    area: "vehicle-photo-area",
    wrap: "vehicle-photo-preview-wrap",
    img: "vehicle-photo-preview",
    placeholder: "vehicle-photo-placeholder",
  },
  selfie: {
    setState: (v) => (selfiePhotoBase64 = v),
    area: "selfie-photo-area",
    wrap: "selfie-photo-preview-wrap",
    img: "selfie-photo-preview",
    placeholder: "selfie-photo-placeholder",
  }
};

// Override previewPhoto to use leader-specific state map
const originalPreviewPhoto = window.previewPhoto;
window.previewPhoto = function(event, type) {
  originalPreviewPhoto(event, type, photoStateMap);
};

// Check authentication and initialise on load
window.addEventListener('DOMContentLoaded', () => {
  leaderSession = checkSession();
  if (leaderSession) {
    document.getElementById("leader-name").value = `${leaderSession.firstName} ${leaderSession.lastName}`.trim();
    initializeDashboardData();
    autoCaptureSilentGPS();
    setupLeaderCalendar();
  }
});

// ════ CALENDAR DYNAMIC TYPE & MIN DATE ════
function setupLeaderCalendar() {
  const typeSelect = document.getElementById("req-view-type");
  const dateInput = document.getElementById("req-target-date");
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
      const monthStr = now.toISOString().split("T")[0].substring(0, 7);
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
}

// ════ GPS — AUTO-FILL (SILENT) ════
function autoCaptureSilentGPS() {
  if (!navigator.geolocation) {
    setLeaderLocationChips('GPS not available', 'error');
    return;
  }
  setLeaderLocationChips('Capturing location…', 'loading');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const coordsStr = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      document.getElementById('leader-gps').value = coordsStr;
      try {
        const res = await postData('getReadableLocation', { lat, lon });
        if (res && res.status === 'success' && res.address) {
          document.getElementById('leader-region').value = res.address;
          const hiddenLoc = document.getElementById('leader-resolved-location');
          if (hiddenLoc) hiddenLoc.value = res.address;
          setLeaderLocationChips(res.address, 'success');
          showToast(`📍 ${res.address}`, 'success', 3500);
        } else {
          setLeaderLocationChips(`${lat.toFixed(4)}, ${lon.toFixed(4)}`, 'success');
        }
      } catch (e) {
        setLeaderLocationChips(`${lat.toFixed(4)}, ${lon.toFixed(4)}`, 'success');
      }
      hideLoader();
    },
    () => setLeaderLocationChips('Location unavailable — tap Refresh GPS', 'error'),
    { timeout: 12000, enableHighAccuracy: true }
  );
}

function leaderManualRefreshGPS() {
  autoCaptureSilentGPS();
}

function setLeaderLocationChips(text, state) {
  const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  ['login-location-chip', 'obj-location-chip'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `location-chip${state === 'error' ? ' error' : state === 'loading' ? ' loading' : ''}`;
    el.innerHTML = `${pinSvg} <span style="overflow:hidden;text-overflow:ellipsis">${text}</span>`;
  });
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
  try {
    const res = await getLeaderData();
    if (res && res.status === "success") {
      const data = {
        agents: res.agents || [],
        leaders: res.leaders || [],
        objectives: res.objectives || [],
        agentStats: res.agentStats || [],
      };
      localStorage.setItem("fibregems_portal_data", JSON.stringify(data));
      applyPortalData(data.agents, data.leaders, data.objectives, data.agentStats);
      if (!isBackground) showToast("Data refreshed! ✓", "success");
    } else if (!isBackground) {
      showToast(res?.message || "Failed to fetch data.", "error");
    }
  } catch (err) {
    if (!isBackground) showToast("Connection error.", "error");
  } finally {
    hideLoader();
  }
}

function applyPortalData(agents, leaders, objectives, agentStats) {
  allLeaderPortalData = { agents, leaders, objectives, agentStats };
  const myName = leaderSession ? `${leaderSession.firstName} ${leaderSession.lastName}`.trim() : '';
  renderTodayAgents(agents, myName);
  renderLeaderObjectives(objectives, myName);
  renderLeaderTeamStats(agents, agentStats, myName);
}

// ════ TAB 1: TODAY'S AGENT SIGN-ONS ════
function renderTodayAgents(agents, myName) {
  const container = document.getElementById('leader-agents-today');
  if (!container) return;

  const myAgents = (agents || []).filter(a =>
    isToday(a.date) &&
    (!myName || (a.leaderName || '').toLowerCase().trim() === myName.toLowerCase().trim())
  );

  if (myAgents.length === 0) {
    container.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-5">No agents have signed on under you today yet.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="divide-y divide-gray-50">
      ${myAgents.map((a, i) => `
        <div class="flex items-center justify-between px-4 py-3 ${i % 2 ? 'stat-row-alt' : ''}">
          <div class="flex items-center gap-3">
            ${photoCell(a.photoUrl, 'Agent selfie')}
            <div>
              <p class="text-[12px] font-bold text-gray-800">${a.agentName || '—'}</p>
              <p class="text-[10px] text-gray-400">${formatSheetTime(a.time)} · ${a.location || a.gps || '—'}</p>
            </div>
          </div>
          <span class="${a.isLate === 'Yes' ? 'badge-late' : 'badge-ontime'} text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
            ${a.isLate === 'Yes' ? 'Late' : 'On Time'}
          </span>
        </div>
      `).join('')}
    </div>`;
}

// ════ TAB 2: OBJECTIVES ════
function renderLeaderObjectives(objectives, myName) {
  const container = document.getElementById('leader-objectives-list');
  if (!container) return;

  const published = (objectives || []).filter(o => {
    const status = (o.status || 'Published');
    return status === 'Published';
  });

  if (published.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="width:22px;height:22px"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        </div>
        <p class="text-sm font-semibold text-gray-500">No active objectives yet</p>
        <p class="text-[11px] text-gray-400 mt-1">Submit a request above or wait for Admin to publish one</p>
      </div>`;
    return;
  }

  container.innerHTML = published.map(o => `
    <div class="objective-card">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div>
          <p class="text-[11px] font-bold text-gray-800">${o.leaderName ? `Assigned to: ${o.leaderName}` : 'All Teams'}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">Target: ${o.targetDate ? formatSheetDate(o.targetDate) : '—'} · ${o.viewType || 'Weekly'}</p>
        </div>
        <span class="obj-badge published">${o.viewType || 'Weekly'}</span>
      </div>
      ${o.assignedLocation ? `<p class="text-[11px] text-gray-600 mb-1">📍 ${o.assignedLocation}</p>` : ''}
      ${o.focusAreas ? `<p class="text-[11px] font-semibold text-emerald-700 mt-1">🎯 ${o.focusAreas}</p>` : ''}
      ${o.targetMetrics ? `<p class="text-[11px] text-gray-500 mt-0.5">Target: ${o.targetMetrics}</p>` : ''}
    </div>
  `).join('');
}

async function submitObjectiveRequest() {
  if (!leaderSession) return;
  const leaderName = `${leaderSession.firstName} ${leaderSession.lastName}`.trim();
  const viewType = document.getElementById('req-view-type').value;
  const targetDate = document.getElementById('req-target-date').value;
  const assignedLocation = document.getElementById('req-location').value.trim();
  const focusAreas = document.getElementById('req-focus').value.trim();
  const targetMetrics = document.getElementById('req-metrics').value.trim();

  if (!targetDate) { showToast("Please select a target date.", "warning"); return; }
  if (!focusAreas) { showToast("Please describe the focus areas.", "warning"); return; }

  const res = await requestObjectiveAPI({
    leaderName,
    viewType,
    targetDate,
    assignedLocation,
    focusAreas,
    targetMetrics: targetMetrics || 'Active Sales',
  });

  if (res && res.status === "success") {
    showToast("Objective request sent to Admin! ✓", "success");
    ["req-location", "req-focus", "req-metrics"].forEach(id => (document.getElementById(id).value = ""));
    document.getElementById("req-target-date").valueAsDate = new Date();
  } else if (res) {
    showToast(res.message || "Request failed.", "error");
  }
}

// ════ TAB 3: AGENT STATS ════
function renderLeaderTeamStats(agents, agentStats, myName) {
  renderTeamActivity(agents, myName);
  renderPerfRecords(agentStats);
}

function renderTeamActivity(agents, myName) {
  const container = document.getElementById('leader-team-stats');
  if (!container) return;

  const myAgents = (agents || []).filter(a =>
    !myName || (a.leaderName || '').toLowerCase().trim() === myName.toLowerCase().trim()
  );

  if (myAgents.length === 0) {
    container.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-6">No agent activity recorded yet.</p>`;
    return;
  }

  const todayCount = myAgents.filter(a => isToday(a.date)).length;
  const lateCount = myAgents.filter(a => isToday(a.date) && a.isLate === 'Yes').length;

  container.innerHTML = `
    <div class="px-4 py-3 grid grid-cols-3 gap-3 border-b border-gray-50">
      <div class="text-center">
        <div class="text-xl font-extrabold text-gray-900">${todayCount}</div>
        <div class="text-[10px] text-gray-400 mt-0.5">Today's Sign-ons</div>
      </div>
      <div class="text-center">
        <div class="text-xl font-extrabold text-amber-500">${lateCount}</div>
        <div class="text-[10px] text-gray-400 mt-0.5">Late Today</div>
      </div>
      <div class="text-center">
        <div class="text-xl font-extrabold text-emerald-600">${myAgents.length}</div>
        <div class="text-[10px] text-gray-400 mt-0.5">Total Sign-ons</div>
      </div>
    </div>
    <div class="divide-y divide-gray-50">
      ${myAgents.slice(0, 20).map((a, i) => `
        <div class="flex items-center justify-between px-4 py-2.5 ${i % 2 ? 'stat-row-alt' : ''}">
          <div>
            <p class="text-[11px] font-semibold text-gray-800">${a.agentName || '—'}</p>
            <p class="text-[10px] text-gray-400">${formatSheetDate(a.date)} · ${formatSheetTime(a.time)} · ${a.location || '—'}</p>
          </div>
          <span class="${a.isLate === 'Yes' ? 'badge-late' : 'badge-ontime'} text-[10px] font-bold px-2 py-0.5 rounded-full">
            ${a.isLate === 'Yes' ? 'Late' : 'On Time'}
          </span>
        </div>
      `).join('')}
    </div>`;
}

function renderPerfRecords(agentStats) {
  const container = document.getElementById('leader-perf-records');
  if (!container) return;

  if (!agentStats || agentStats.length === 0) {
    container.innerHTML = `<p class="text-[11px] text-gray-400 text-center py-6">No performance records logged yet.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="divide-y divide-gray-50">
      ${agentStats.map((s, i) => `
        <div class="flex items-center justify-between px-4 py-2.5 ${i % 2 ? 'stat-row-alt' : ''}">
          <div>
            <p class="text-[11px] font-semibold text-gray-800">${s.agentName || '—'}</p>
            <p class="text-[10px] text-gray-400">${formatSheetDate(s.date)} · ${s.notes || '—'}</p>
          </div>
          <div class="flex items-center gap-1.5">
            ${parseInt(s.strikes || 0) > 0 ? `<span class="badge-late text-[10px] font-bold px-2 py-0.5 rounded-full">${s.strikes} Strike${s.strikes > 1 ? 's' : ''}</span>` : `<span class="badge-ontime text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>`}
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ════ CHECK-IN SUBMISSION ════
async function submitLeaderCheckIn() {
  const leaderName = document.getElementById("leader-name").value.trim();
  const region = document.getElementById("leader-region").value.trim();
  const gps = document.getElementById("leader-gps").value || "Auto-captured";
  const resolvedLocationInput = document.getElementById("leader-resolved-location");
  const location = resolvedLocationInput ? resolvedLocationInput.value : "";

  if (!leaderName) { showToast("Please enter your name.", "warning"); return; }
  if (!region) { showToast("Please enter your assigned region.", "warning"); return; }

  const res = await submitLeaderCheckInAPI({
    leaderName, region, vehiclePhotoBase64, selfiePhotoBase64, gps, location,
  });

  if (res && res.status === "success") {
    showToast("Vehicle check submitted! ✓", "success");
    ["leader-region", "leader-gps"].forEach(id => (document.getElementById(id).value = ""));
    if (resolvedLocationInput) resolvedLocationInput.value = "";
    vehiclePhotoBase64 = selfiePhotoBase64 = "";
    ["vehicle-photo", "selfie-photo"].forEach(prefix => {
      document.getElementById(`${prefix}-placeholder`).classList.remove("hidden");
      document.getElementById(`${prefix}-preview-wrap`).classList.add("hidden");
      document.getElementById(`${prefix}-area`).classList.remove("has-photo");
    });
    setLeaderLocationChips('Capturing location…', 'loading');
    autoCaptureSilentGPS();
  } else if (res) showToast(res.message || "Submission failed.", "error");
}

// ════ SAVE AGENT NOTE ════
async function saveAgentManagementNote() {
  const agentName = document.getElementById("manage-agent-name").value.trim();
  const status = document.getElementById("manage-agent-status").value;
  const notes = document.getElementById("manage-agent-notes").value.trim();
  if (!agentName) { showToast("Enter the agent name.", "warning"); return; }

  const res = await logAgentStatsAPI({
    agentName,
    strikes: status === "Needs Support" ? 1 : status === "Absent" ? 2 : 0,
    notes: notes || status,
  });
  if (res && res.status === "success") {
    showToast("Agent record saved. ✓", "success");
    document.getElementById("manage-agent-name").value = "";
    document.getElementById("manage-agent-notes").value = "";
    fetchAllPortalData(true);
  } else if (res) showToast(res.message || "Update failed.", "error");
}