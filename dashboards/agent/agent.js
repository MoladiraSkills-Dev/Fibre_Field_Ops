// ════ AGENT DASHBOARD LOGIC ════

let agentPhotoBase64 = "";
let allLeaderData = [];
let allObjectives = [];

// Photo state configuration for previewPhoto function
const photoStateMap = {
  agent: {
    setState: (v) => (agentPhotoBase64 = v),
    area: "agent-photo-area",
    wrap: "agent-photo-preview-wrap",
    img: "agent-photo-preview",
    placeholder: "agent-photo-placeholder",
  }
};

// Override previewPhoto to use agent-specific state map
const originalPreviewPhoto = window.previewPhoto;
window.previewPhoto = function(event, type) {
  originalPreviewPhoto(event, type, photoStateMap);
};

// Check authentication and initialise on load
window.addEventListener('DOMContentLoaded', () => {
  const session = checkSession();
  if (session) {
    document.getElementById("agent-name").value = `${session.firstName} ${session.lastName}`.trim();
    initializeDashboardData();
    // Auto-capture GPS on load for both tabs
    autoCaptureSilentGPS();
  }
});

// ════ TAB SWITCHING ════
function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`nav-${tabName}`).classList.add('active');
}

// ════ GPS — AUTO-FILL (SILENT, NO GLOBAL LOADER) ════
function autoCaptureSilentGPS() {
  if (!navigator.geolocation) {
    setLocationChips('GPS not available', 'error');
    return;
  }
  setLocationChips('Capturing location…', 'loading');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const coordsStr = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      document.getElementById('agent-gps').value = coordsStr;
      try {
        const res = await postData('getReadableLocation', { lat, lon });
        const locName = (res && res.display_name) ? res.display_name : (res && res.address ? res.address : null);
        if (res && res.status === 'success' && locName) {
          document.getElementById('agent-location').value = locName;
          const hiddenLoc = document.getElementById('agent-resolved-location');
          if (hiddenLoc) hiddenLoc.value = locName;
          setLocationChips(locName, 'success');
          showToast(`📍 ${locName}`, 'success', 3500);
        } else {
          setLocationChips(`${lat.toFixed(4)}, ${lon.toFixed(4)}`, 'success');
        }
      } catch (e) {
        setLocationChips(`${lat.toFixed(4)}, ${lon.toFixed(4)}`, 'success');
      }
      hideLoader(); // ensure loader is dismissed
    },
    () => setLocationChips('Location unavailable — tap Refresh GPS', 'error'),
    { timeout: 12000, enableHighAccuracy: true }
  );
}

// Manual GPS refresh (same as auto but triggered by button)
function manualRefreshGPS() {
  autoCaptureSilentGPS();
}

function setLocationChips(text, state) {
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
      applyPortalData(parsed.agents || [], parsed.leaders || [], parsed.objectives || []);
    } catch (e) {}
  }
  fetchAllPortalData(true);
}

async function fetchAllPortalData(isBackground = false) {
  try {
    const res = await getAgentData();
    if (res && res.status === "success") {
      localStorage.setItem("fibregems_portal_data", JSON.stringify({
        agents: res.agents || [],
        leaders: res.leaders || [],
        objectives: res.objectives || [],
      }));
      applyPortalData(res.agents, res.leaders, res.objectives || []);
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

function applyPortalData(agents, leaders, objectives) {
  allLeaderData = leaders || [];
  allObjectives = objectives || [];
  populateLeaderDropdown(allLeaderData);
  renderObjectives(allObjectives);
}

function populateLeaderDropdown(leaders) {
  const select = document.getElementById("agent-leader-select");
  const prev = select.value;
  const todayNames = [
    ...new Set(
      leaders.filter((l) => isToday(l.date)).map((l) => l.leaderName).filter(Boolean),
    ),
  ];
  select.innerHTML = `<option value="">-- Select Team Leader --</option>`;
  if (todayNames.length === 0)
    select.innerHTML += `<option value="" disabled>No leaders checked in today yet</option>`;
  else
    todayNames.forEach((n) => {
      select.innerHTML += `<option value="${n}">${n}</option>`;
    });
  if (prev) select.value = prev;
}

// ════ OBJECTIVES RENDERING ════
function renderObjectives(objectives) {
  const container = document.getElementById('agent-objectives-list');
  if (!container) return;

  const active = (objectives || []).filter(o =>
    o.status === 'Published' || !o.status
  );

  if (active.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        </div>
        <p class="text-sm font-semibold text-gray-500">No objectives assigned yet</p>
        <p class="text-[11px] text-gray-400 mt-1">Check back later or ask your Team Leader</p>
      </div>`;
    return;
  }

  container.innerHTML = active.map(o => `
    <div class="objective-card">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div>
          <p class="text-[11px] font-bold text-gray-800">${o.leaderName ? `Leader: ${o.leaderName}` : 'All Teams'}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">Target: ${o.targetDate ? formatSheetDate(o.targetDate) : '—'} &middot; ${o.viewType || 'Weekly'}</p>
        </div>
        <span class="obj-badge published">${o.viewType || 'Weekly'}</span>
      </div>
      ${o.assignedLocation ? `<p class="text-[11px] text-gray-600 flex items-center gap-1 mb-1">📍 ${o.assignedLocation}</p>` : ''}
      ${o.focusAreas ? `<p class="text-[11px] font-semibold text-emerald-700 mt-1">🎯 ${o.focusAreas}</p>` : ''}
      ${o.targetHouses ? `<p class="text-[11px] font-semibold text-amber-700 mt-0.5">🏠 Target: ${o.targetHouses} houses</p>` : ''}
      ${o.targetMetrics ? `<p class="text-[11px] text-gray-500 mt-0.5">Metrics: ${o.targetMetrics}</p>` : ''}
    </div>
  `).join('');
}

// ════ CLOCK-IN SUBMISSION ════
async function submitAgentClockIn() {
  const agentName = document.getElementById("agent-name").value.trim();
  const leaderName = document.getElementById("agent-leader-select").value;
  const typedLocation = document.getElementById("agent-location").value.trim();
  const taskNotes = document.getElementById("agent-notes").value.trim();
  const gps = document.getElementById("agent-gps").value;
  const resolvedLocationInput = document.getElementById("agent-resolved-location");
  const resolvedLocation = resolvedLocationInput ? resolvedLocationInput.value : "";

  if (!agentName) { showToast("Please enter your name.", "warning"); return; }
  if (!leaderName) { showToast("Please select your Team Leader.", "warning"); return; }
  if (!typedLocation && !resolvedLocation) {
    showToast("Please enter or pin your active location.", "warning");
    return;
  }

  const res = await submitAgentSignOnAPI({
    agentName,
    leaderName,
    typedLocation,
    resolvedLocation,
    photoUrl: agentPhotoBase64,
    taskNotes,
    gps,
  });

  if (res && res.status === "success") {
    res.isLate === "Yes"
      ? showToast("Clocked in — marked LATE (after 10:00 AM).", "warning", 5000)
      : showToast("Clock-in submitted successfully! ✓", "success");
    ["agent-location", "agent-notes"].forEach((id) => (document.getElementById(id).value = ""));
    document.getElementById("agent-gps").value = "";
    if (resolvedLocationInput) resolvedLocationInput.value = "";
    agentPhotoBase64 = "";
    document.getElementById("agent-photo-placeholder").classList.remove("hidden");
    document.getElementById("agent-photo-preview-wrap").classList.add("hidden");
    document.getElementById("agent-photo-area").classList.remove("has-photo");
    setLocationChips('Capturing location…', 'loading');
    autoCaptureSilentGPS(); // re-capture GPS after submission
  } else if (res) showToast(res.message || "Submission failed.", "error");
}