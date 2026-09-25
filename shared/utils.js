// ════ GPS CAPTURE & SECURE REVERSE GEOCODING ════
function captureGPS(fieldId, postDataFunction) {
  if (!navigator.geolocation) {
    showToast("GPS not supported on this device.", "error");
    return;
  }

  showToast("Capturing GPS & identifying area…", "info", 3000);

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const coordsStr = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

      // Populate the coordinates field
      document.getElementById(fieldId).value = coordsStr;

      // Fetch the readable address from the backend
      const res = await postDataFunction("getReadableLocation", { lat, lon });

      if (res && res.status === "success" && res.address) {
        if (fieldId === "agent-gps") {
          document.getElementById("agent-location").value = res.address;
          const hiddenLoc = document.getElementById("agent-resolved-location");
          if (hiddenLoc) hiddenLoc.value = res.address;
        } else if (fieldId === "leader-gps") {
          document.getElementById("leader-region").value = res.address;
          const hiddenLoc = document.getElementById("leader-resolved-location");
          if (hiddenLoc) hiddenLoc.value = res.address;
        }
        showToast(`Pinned: ${res.address} ✓`, "success");
      } else {
        showToast("GPS coordinates saved ✓", "info");
      }
    },
    () => showToast("GPS access denied or unavailable.", "error"),
  );
}

// ════ LOADER & TOAST ════
function showLoader() {
  const el = document.getElementById("global-loader");
  if (el) el.classList.add("active");
}

function hideLoader() {
  const el = document.getElementById("global-loader");
  if (el) el.classList.remove("active");
}

function showToast(msg, type = "success", ms = 3800) {
  const icons = {
    success: "check-circle",
    error: "x-circle",
    warning: "alert-triangle",
    info: "info",
  };
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<i data-lucide="${icons[type]}" style="width:15px;height:15px;flex-shrink:0"></i><span>${msg}</span>`;
  c.appendChild(t);
  lucide.createIcons({ nodes: [t] });
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 280);
  }, ms);
}

// ════ PHOTO PREVIEW & LIGHTBOX ════
function previewPhoto(event, type, photoStateMap) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = e.target.result;
    const cfg = photoStateMap[type];
    if (!cfg) return;
    cfg.setState(data);
    document.getElementById(cfg.img).src = data;
    document.getElementById(cfg.wrap).classList.remove("hidden");
    document.getElementById(cfg.placeholder).classList.add("hidden");
    document.getElementById(cfg.area).classList.add("has-photo");
  };
  reader.readAsDataURL(file);
}

function openLightbox(url) {
  let rawUrl = url;
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const id = m1 ? m1[1] : (m2 ? m2[1] : null);
  if (id && !url.includes("lh3.googleusercontent.com")) {
    rawUrl = `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
  }
  document.getElementById("lightbox-img").src = rawUrl;
  
  // Update the fallback download/open link to safely point to the Drive view page
  const downloadBtn = document.getElementById("lightbox-download-btn");
  if (downloadBtn) {
    downloadBtn.href = id ? `https://drive.google.com/file/d/${id}/view` : url;
  }
  
  document.getElementById("lightbox").classList.add("open");
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
}

// ════ FORMATTERS ════
function formatSheetDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSheetTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
}

function isToday(dateVal) {
  if (!dateVal) return false;
  return (
    new Date(dateVal).toLocaleDateString("en-ZA") ===
    new Date().toLocaleDateString("en-ZA")
  );
}

function driveThumb(url) {
  if (!url) return null;
  let cleanUrl = String(url).trim();
  const mdMatch = cleanUrl.match(/(https?:\/\/[^\s\)]+)/);
  if (mdMatch) cleanUrl = mdMatch[1];
  else if (!cleanUrl.startsWith("http")) return null;

  if (cleanUrl.includes("lh3.googleusercontent.com")) return cleanUrl;
  const m1 = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const m2 = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const id = m1 ? m1[1] : (m2 ? m2[1] : null);
  
  // Use the /thumbnail endpoint to bypass ORB and Google's hotlink restrictions for <img> tags
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  return cleanUrl;
}

function photoCell(url, alt) {
  if (!url) return `<span class="text-gray-400 text-[10px]">No Photo</span>`;
  let cleanUrl = String(url).trim();
  const mdMatch = cleanUrl.match(/(https?:\/\/[^\s\)]+)/);
  if (mdMatch) cleanUrl = mdMatch[1];

  const thumb = driveThumb(cleanUrl);
  if (!thumb)
    return `<span class="text-gray-400 text-[10px]">No Photo</span>`;
  
  const safeUrl = cleanUrl.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const safeThumb = thumb.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  
  return `<img src="${safeThumb}" loading="lazy" decoding="async" class="photo-thumb" onclick="openLightbox('${safeUrl}')" alt="${alt}" onerror="this.outerHTML='<a href=&quot;${safeUrl}&quot; target=&quot;_blank&quot; class=&quot;text-blue-600 underline text-[10px]&quot;>Open</a>'">`;
}

// ════ MAP UTILITIES ════
function parseGPS(str) {
  if (!str || str === "Auto-captured") return null;
  const m = String(str).match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}