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

// ════ LIVE NETWORK & PERFORMANCE TELEMETRY MONITOR ════
const Telemetry = {
  totalBytesSent: 0,
  totalBytesReceived: 0,
  requests: [],

  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  logRequest(type, action, bytesSent, bytesReceived, durationMs) {
    this.totalBytesSent += bytesSent;
    this.totalBytesReceived += bytesReceived;
    const totalSessionBytes = this.totalBytesSent + this.totalBytesReceived;
    const totalReqBytes = bytesSent + bytesReceived;
    const speedKbps = durationMs > 0 ? ((totalReqBytes / 1024) / (durationMs / 1000)).toFixed(1) : 0;

    const record = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      action,
      sent: this.formatBytes(bytesSent),
      received: this.formatBytes(bytesReceived),
      totalPayload: this.formatBytes(totalReqBytes),
      duration: `${durationMs.toFixed(0)} ms`,
      transferSpeed: `${speedKbps} KB/s`,
      sessionTotal: this.formatBytes(totalSessionBytes)
    };

    this.requests.push(record);

    // Styled Console Output for Live Monitoring
    console.groupCollapsed(
      `%c📡 [NET TELEMETRY] %c${type} %c${action} %c• %c${durationMs.toFixed(0)}ms %c• %c${this.formatBytes(totalReqBytes)} %c• %c${speedKbps} KB/s`,
      "background:#0f172a;color:#38bdf8;font-weight:bold;padding:2px 6px;border-radius:4px;",
      "background:#0284c7;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;",
      "color:#0f172a;font-weight:bold;",
      "color:#94a3b8;",
      "color:#10b981;font-weight:bold;",
      "color:#94a3b8;",
      "color:#f59e0b;font-weight:bold;",
      "color:#94a3b8;",
      "color:#6366f1;font-weight:bold;"
    );
    console.log(`⏱️ Round-Trip Latency:  ${durationMs.toFixed(1)} ms`);
    console.log(`📤 Data Sent (Upload):   ${this.formatBytes(bytesSent)} (${bytesSent.toLocaleString()} bytes)`);
    console.log(`📥 Data Recv (Download): ${this.formatBytes(bytesReceived)} (${bytesReceived.toLocaleString()} bytes)`);
    console.log(`⚡ Processing Speed:    ${speedKbps} KB/s`);
    console.log(`📊 Cumulative Session:  ${this.formatBytes(totalSessionBytes)} (Sent: ${this.formatBytes(this.totalBytesSent)}, Recv: ${this.formatBytes(this.totalBytesReceived)})`);
    console.groupEnd();
  },

  summary() {
    console.log("%c══════════ FIBREGEMS LIVE DATA & SPEED SUMMARY ══════════", "color:#f59e0b;font-weight:bold;");
    console.table(this.requests);
    console.log(
      `%c📊 Total Mobile Data Used: %c${this.formatBytes(this.totalBytesSent + this.totalBytesReceived)} ` +
      `%c(Sent: ${this.formatBytes(this.totalBytesSent)} | Recv: ${this.formatBytes(this.totalBytesReceived)}) ` +
      `%cacross %c${this.requests.length} %crequests.`,
      "font-weight:bold;color:#0f172a;",
      "background:#10b981;color:white;font-weight:bold;padding:2px 6px;border-radius:4px;",
      "color:#64748b;",
      "color:#0f172a;",
      "color:#0284c7;font-weight:bold;",
      "color:#0f172a;"
    );
    return {
      totalSent: this.formatBytes(this.totalBytesSent),
      totalReceived: this.formatBytes(this.totalBytesReceived),
      totalData: this.formatBytes(this.totalBytesSent + this.totalBytesReceived),
      requestCount: this.requests.length,
      history: this.requests
    };
  },

  reset() {
    this.totalBytesSent = 0;
    this.totalBytesReceived = 0;
    this.requests = [];
    console.log("Telemetry counters reset.");
  }
};

window.telemetry = Telemetry;
window.getLiveMetrics = () => Telemetry.summary();

// Log Initial Page Load Performance
window.addEventListener("load", () => {
  setTimeout(() => {
    let loadTime = 0, ttfb = 0, totalResourcesSize = 0;
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      loadTime = nav.loadEventEnd > 0 ? (nav.loadEventEnd - nav.startTime).toFixed(0) : 0;
      ttfb = (nav.responseStart - nav.requestStart).toFixed(0);
    }

    const resources = performance.getEntriesByType("resource");
    let resourceCount = 0;
    resources.forEach(r => {
      resourceCount++;
      if (r.transferSize) totalResourcesSize += r.transferSize;
      else if (r.decodedBodySize) totalResourcesSize += r.decodedBodySize;
    });

    console.group(
      `%c⚡ [PAGE LOAD PERF] %c${document.title || "Portal"} %c• %c${loadTime}ms %c• %c${Telemetry.formatBytes(totalResourcesSize)}`,
      "background:#0f172a;color:#38bdf8;font-weight:bold;padding:2px 6px;border-radius:4px;",
      "color:#0f172a;font-weight:bold;",
      "color:#94a3b8;",
      "color:#10b981;font-weight:bold;",
      "color:#94a3b8;",
      "color:#f59e0b;font-weight:bold;"
    );
    console.log(`⏱️ Page Load Time:       ${loadTime} ms`);
    console.log(`🌐 Server Response (TTFB): ${ttfb} ms`);
    console.log(`📦 Resources Transferred: ${Telemetry.formatBytes(totalResourcesSize)} across ${resourceCount} files`);
    console.log(`💡 Type %cgetLiveMetrics()%c or %ctelemetry.summary()%c in console anytime for full live metrics.`, "color:#0284c7;font-weight:bold;", "", "color:#0284c7;font-weight:bold;", "");
    console.groupEnd();
  }, 300);
});

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
    const startTime = performance.now();
    const origBytes = Math.round(dataUrl.length * 0.75); // base64 to byte approximation

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
      const compressedUrl = canvas.toDataURL('image/jpeg', quality);
      const compBytes = Math.round(compressedUrl.length * 0.75);
      const compDuration = (performance.now() - startTime).toFixed(0);
      const savedPct = origBytes > 0 ? (((origBytes - compBytes) / origBytes) * 100).toFixed(1) : 0;

      console.groupCollapsed(
        `%c🖼️ [IMAGE COMPRESSION] %c${Telemetry.formatBytes(origBytes)} → ${Telemetry.formatBytes(compBytes)} %c(-${savedPct}%) %c• %c${compDuration}ms`,
        "background:#10b981;color:white;font-weight:bold;padding:2px 6px;border-radius:4px;",
        "color:#0f172a;font-weight:bold;",
        "color:#10b981;font-weight:bold;",
        "color:#94a3b8;",
        "color:#6366f1;font-weight:bold;"
      );
      console.log(`Original Photo Size:    ${Telemetry.formatBytes(origBytes)} (${origBytes.toLocaleString()} bytes)`);
      console.log(`Compressed Photo Size:  ${Telemetry.formatBytes(compBytes)} (${compBytes.toLocaleString()} bytes)`);
      console.log(`Mobile Data Saved:      ${savedPct}% reduction`);
      console.log(`Compression Duration:   ${compDuration} ms`);
      console.groupEnd();

      resolve(compressedUrl);
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
 * POST to the Apps Script backend with live telemetry and data measurement.
 * @param {boolean} [showSpinner=true]  Set to false for silent background calls.
 */
async function postData(action, payload, showSpinner = true) {
  const reqStartTime = performance.now();

  // Compress any embedded images before sending
  if (payload && typeof payload === 'object') {
    payload = await compressPayloadImages({ ...payload });
  }

  const requestBody = JSON.stringify({ action, payload });
  const bytesSent = new Blob([requestBody]).size;

  if (showSpinner) showLoader();
  try {
    const res = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: requestBody,
      redirect: "follow",
    });

    const text = await res.text();
    const durationMs = performance.now() - reqStartTime;
    const bytesReceived = new Blob([text]).size;

    if (showSpinner) hideLoader();

    // Log to live telemetry
    Telemetry.logRequest("POST", action, bytesSent, bytesReceived, durationMs);

    try {
      return JSON.parse(text);
    } catch (e) {
      showToast("Invalid API response. Check Google Apps Script deployment.", "error");
      return null;
    }
  } catch (err) {
    const durationMs = performance.now() - reqStartTime;
    if (showSpinner) hideLoader();
    Telemetry.logRequest("POST (FAILED)", action, bytesSent, 0, durationMs);
    showToast(err.message || "Network error. Check Google Apps Script deployment.", "error");
    return null;
  }
}

/**
 * GET from the Apps Script backend with live telemetry and data measurement.
 */
async function getData(action) {
  const reqStartTime = performance.now();
  const url = `${APP_SCRIPT_URL}?action=${action}&t=${Date.now()}`;
  const bytesSent = url.length; // Approximate query string size

  try {
    const res = await fetch(url, {
      redirect: "follow",
      cache: "no-store"
    });
    const text = await res.text();
    const durationMs = performance.now() - reqStartTime;
    const bytesReceived = new Blob([text]).size;

    // Log to live telemetry
    Telemetry.logRequest("GET", action, bytesSent, bytesReceived, durationMs);

    return JSON.parse(text);
  } catch (err) {
    const durationMs = performance.now() - reqStartTime;
    Telemetry.logRequest("GET (FAILED)", action, bytesSent, 0, durationMs);
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