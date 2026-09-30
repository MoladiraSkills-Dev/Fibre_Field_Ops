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

// ════ IMAGE COMPRESSION UTILITY ════
/**
 * Compresses a base64 data-URL image using an off-screen canvas.
 * Resizes to maxDim x maxDim (maintaining aspect ratio) and re-encodes as JPEG.
 * Returns the compressed data-URL, or the original if compression isn't possible.
 * Typical reduction: a 3 MB phone photo → ~120–200 kB.
 */
function compressBase64Image(dataUrl, maxDim = 1024, quality = 0.72) {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else                 { width  = Math.round(width  * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback: send original
    img.src = dataUrl;
  });
}

/** Walk a payload object and compress any base64 image string values in-place. */
async function compressPayloadImages(payload) {
  const fields = ['photoUrl', 'photoBase64', 'selfiePhotoBase64', 'vehiclePhotoBase64'];
  for (const key of fields) {
    if (payload[key] && String(payload[key]).startsWith('data:image')) {
      payload[key] = await compressBase64Image(payload[key]);
    }
  }
  return payload;
}

// ════ UNIVERSAL API FETCH HELPERS ════

/**
 * POST to the Apps Script backend.
 * Automatically compresses any image payloads before sending
 * to avoid hitting the GAS body size limit (~50 MB uncompressed,
 * but large base64 strings cause very long upload times).
 *
 * @param {boolean} [showSpinner=true]  Set to false for silent background calls.
 */
async function postData(action, payload, showSpinner = true) {
  // Compress any embedded images before sending
  if (payload && typeof payload === 'object') {
    payload = await compressPayloadImages({ ...payload });
  }

  if (showSpinner) showLoader();
  try {
    const res = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
      redirect: "follow",
    });

    const text = await res.text();
    if (showSpinner) hideLoader();

    try {
      return JSON.parse(text);
    } catch (e) {
      showToast("Invalid API response. Check Google Apps Script deployment.", "error");
      return null;
    }
  } catch (err) {
    if (showSpinner) hideLoader();
    showToast(err.message || "Network error. Check Google Apps Script deployment.", "error");
    return null;
  }
}

/**
 * GET from the Apps Script backend.
 * Never shows the global loader — callers that need a spinner should
 * manage it themselves so that background refreshes stay silent.
 */
async function getData(action) {
  try {
    const res = await fetch(`${APP_SCRIPT_URL}?action=${action}&t=${Date.now()}`, {
      redirect: "follow",
      cache: "no-store"
    });
    return await res.json();
  } catch (err) {
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

async function deleteTeamLeaderAPI(email) {
  return await postData("deleteTeamLeader", { email });
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

async function logAgentIssueAPI(payload) {
  return await postData("logAgentStats", payload);
}

async function deleteAgentStatAPI(payload) {
  return await postData("deleteAgentStat", payload);
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

/** Lightweight fetch — today's agents + leaders only (uses its own short-TTL cache on the server). */
async function getTodayAgents() {
  return await getData("getTodayAgents");
}

/**
 * Reverse-geocode coordinates.
 * Routes through the Apps Script backend so the LocationIQ API key
 * never needs to appear in client-side code.
 */
async function getReadableLocation(lat, lon) {
  return await postData("getReadableLocation", { lat, lon }, false);
}

// ════ OBJECTIVES API ════
async function requestObjectiveAPI(payload) {
  return await postData("requestObjective", payload);
}

async function approveObjectiveAPI(payload) {
  return await postData("approveObjective", payload);
}