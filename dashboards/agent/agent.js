// ════ AGENT DASHBOARD LOGIC ════

let agentPhotoBase64 = "";
let allLeaderData = [];

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

// Override captureGPS to use postData from api.js
const originalCaptureGPS = window.captureGPS;
window.captureGPS = function(fieldId) {
  originalCaptureGPS(fieldId, postData);
};

// Check authentication on load
window.addEventListener('DOMContentLoaded', () => {
  const session = checkSession();
  if (session) {
    document.getElementById("agent-name").value = `${session.firstName} ${session.lastName}`.trim();
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
  try {
    const res = await getAgentData();
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
    } else if (!isBackground) {
      showToast(res.message || "Failed to fetch data.", "error");
    }
  } catch (err) {
    if (!isBackground) showToast("Connection error.", "error");
  }
}

function applyPortalData(agents, leaders) {
  allLeaderData = leaders || [];
  populateLeaderDropdown(allLeaderData);
  document.getElementById("agent-objectives-box").innerHTML =
    `<p class="text-xs text-gray-400 italic">No objectives assigned for today yet — check with your Team Leader.</p>`;
}

function populateLeaderDropdown(leaders) {
  const select = document.getElementById("agent-leader-select");
  const prev = select.value;
  const todayNames = [
    ...new Set(
      leaders
        .filter((l) => isToday(l.date))
        .map((l) => l.leaderName)
        .filter(Boolean),
    ),
  ];
  select.innerHTML = `<option value="">-- Select Team Leader --</option>`;
  if (todayNames.length === 0)
    select.innerHTML += `<option value="" disabled class="text-gray-400">No leaders checked in today yet</option>`;
  else
    todayNames.forEach((n) => {
      select.innerHTML += `<option value="${n}">${n}</option>`;
    });
  if (prev) select.value = prev;
}

async function submitAgentClockIn() {
  const agentName = document.getElementById("agent-name").value.trim();
  const leaderName = document.getElementById("agent-leader-select").value;
  const typedLocation = document
    .getElementById("agent-location")
    .value.trim();
  const taskNotes = document.getElementById("agent-notes").value.trim();
  const gps = document.getElementById("agent-gps").value;

  const resolvedLocationInput = document.getElementById(
    "agent-resolved-location",
  );
  const resolvedLocation = resolvedLocationInput
    ? resolvedLocationInput.value
    : "";

  if (!agentName) {
    showToast("Please enter your name.", "warning");
    return;
  }
  if (!leaderName) {
    showToast("Please select your Team Leader.", "warning");
    return;
  }
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
      ? showToast(
          "Clocked in — marked LATE (after 10:00 AM).",
          "warning",
          5000,
        )
      : showToast("Clock-in submitted successfully! ✓", "success");
    ["agent-location", "agent-notes"].forEach(
      (id) => (document.getElementById(id).value = ""),
    );
    document.getElementById("agent-gps").value = "";
    if (resolvedLocationInput) resolvedLocationInput.value = "";
    agentPhotoBase64 = "";
    document
      .getElementById("agent-photo-placeholder")
      .classList.remove("hidden");
    document
      .getElementById("agent-photo-preview-wrap")
      .classList.add("hidden");
    document
      .getElementById("agent-photo-area")
      .classList.remove("has-photo");
  } else if (res) showToast(res.message || "Submission failed.", "error");
}