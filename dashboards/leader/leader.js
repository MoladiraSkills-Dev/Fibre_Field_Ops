// ════ LEADER DASHBOARD LOGIC ════

let vehiclePhotoBase64 = "";
let selfiePhotoBase64 = "";

// Photo state configuration for previewPhoto function
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

// Override captureGPS to use postData from api.js
const originalCaptureGPS = window.captureGPS;
window.captureGPS = function(fieldId) {
  originalCaptureGPS(fieldId, postData);
};

// Check authentication on load
window.addEventListener('DOMContentLoaded', () => {
  const session = checkSession();
  if (session) {
    document.getElementById("leader-name").value = `${session.firstName} ${session.lastName}`.trim();
  }
});

async function submitLeaderCheckIn() {
  const leaderName = document.getElementById("leader-name").value.trim();
  const region = document.getElementById("leader-region").value.trim();
  const gps =
    document.getElementById("leader-gps").value || "Auto-captured";

  const resolvedLocationInput = document.getElementById(
    "leader-resolved-location",
  );
  const location = resolvedLocationInput
    ? resolvedLocationInput.value
    : "";

  if (!leaderName) {
    showToast("Please enter your name.", "warning");
    return;
  }
  if (!region) {
    showToast("Please enter your assigned region.", "warning");
    return;
  }

  const res = await submitLeaderCheckInAPI({
    leaderName,
    region,
    vehiclePhotoBase64,
    selfiePhotoBase64,
    gps,
    location,
  });

  if (res && res.status === "success") {
    showToast("Vehicle check submitted! ✓", "success");
    ["leader-region", "leader-gps"].forEach(
      (id) => (document.getElementById(id).value = ""),
    );
    if (resolvedLocationInput) resolvedLocationInput.value = "";
    vehiclePhotoBase64 = selfiePhotoBase64 = "";
    ["vehicle-photo", "selfie-photo"].forEach((prefix) => {
      document
        .getElementById(`${prefix}-placeholder`)
        .classList.remove("hidden");
      document
        .getElementById(`${prefix}-preview-wrap`)
        .classList.add("hidden");
      document
        .getElementById(`${prefix}-area`)
        .classList.remove("has-photo");
    });
  } else if (res) showToast(res.message || "Submission failed.", "error");
}

async function saveAgentManagementNote() {
  const agentName = document
    .getElementById("manage-agent-name")
    .value.trim();
  const status = document.getElementById("manage-agent-status").value;
  if (!agentName) {
    showToast("Enter the agent name.", "warning");
    return;
  }
  const res = await logAgentStatsAPI({
    agentName,
    strikes: status === "Needs Support" ? 1 : 0,
  });
  if (res && res.status === "success")
    showToast("Agent status updated. ✓", "success");
  else if (res) showToast(res.message || "Update failed.", "error");
}