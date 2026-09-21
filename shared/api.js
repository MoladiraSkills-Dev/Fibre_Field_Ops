// ════ API COMMUNICATION LAYER ════

// ==========================================
// REPLACE THIS URL WITH YOUR NEW WEB APP URL
// ==========================================
const APP_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzoqUU8FO5eF3TUkiyfdurKfyGU1F56mH2hTcZ_10m9rD4qxcdRCw2hpmJcJi2pQNK9IQ/exec";

// ==========================================
// GOOGLE APPS SCRIPT DEPLOYMENT INSTRUCTIONS
// ==========================================
// 1. Open your Google Apps Script project
// 2. Click "Deploy" → "New deployment"
// 3. Select type: "Web app"
// 4. Description: "FibreGems Field Operations API"
// 5. Execute as: "Me" (your email)
// 6. Who has access: "Anyone" (IMPORTANT for external access)
// 7. Click "Deploy" and copy the URL
// 8. Replace the APP_SCRIPT_URL above with your new URL
// ==========================================

// ════ UNIVERSAL API FETCH HELPER ════
async function postData(action, payload) {
  showLoader();
  try {
    const res = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
      redirect: "follow",
    });

    const text = await res.text();
    hideLoader();

    // Check if response is valid JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      // If not JSON, return error
      showToast("Invalid API response. Check Google Apps Script deployment.", "error");
      return null;
    }
  } catch (err) {
    hideLoader();
    showToast(err.message || "Network error. Check Google Apps Script deployment.", "error");
    return null;
  }
}

async function getData(action) {
  showLoader();
  try {
    const res = await fetch(`${APP_SCRIPT_URL}?action=${action}`, {
      redirect: "follow",
    });

    const data = await res.json();
    hideLoader();
    return data;
  } catch (err) {
    hideLoader();
    showToast(err.message || "Network error. Check Google Apps Script deployment.", "error");
    return null;
  }
}

// ════ AUTHENTICATION API ════
async function loginUser(email, password) {
  return await postData("loginUser", { email, password });
}

async function registerUser(email, firstName, lastName, password) {
  return await postData("registerUser", { email, firstName, lastName, password });
}

async function addTeamLeaderAPI(payload) {
  return await postData("addTeamLeader", payload);
}

// ════ AGENT API ════
async function submitAgentSignOnAPI(payload) {
  return await postData("submitAgentSignOn", payload);
}

async function getAgentData() {
  return await getData("getPortalData");
}

// ════ LEADER API ════
async function submitLeaderCheckInAPI(payload) {
  return await postData("submitLeaderCheckIn", payload);
}

async function logAgentStatsAPI(payload) {
  return await postData("logAgentStats", payload);
}

async function getLeaderData() {
  return await getData("getPortalData");
}

// ════ ADMIN API ════
async function setWeeklyObjective(payload) {
  return await postData("setWeeklyObjective", payload);
}

async function getSuperAdminData() {
  return await getData("getSuperAdminData");
}

async function getReadableLocation(lat, lon) {
  return await postData("getReadableLocation", { lat, lon });
}

// ════ OBJECTIVES API ════
async function requestObjectiveAPI(payload) {
  return await postData("requestObjective", payload);
}

async function approveObjectiveAPI(payload) {
  return await postData("approveObjective", payload);
}