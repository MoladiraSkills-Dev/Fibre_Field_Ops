// ════ AUTHENTICATION LOGIC ════

const SESSION_KEY = "fibregems_session";

function toggleAuth(view) {
  document.getElementById("authAlert").classList.add("hidden");
  if (view === "register") {
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.remove("hidden");
  } else {
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("loginForm").classList.remove("hidden");
  }
}

function showAuthAlert(msg, type) {
  const alert = document.getElementById("authAlert");
  alert.className = `mb-4 p-3 rounded-xl text-sm font-semibold text-center ${type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`;
  alert.innerText = msg;
  alert.classList.remove("hidden");
}

async function handleLogin(e, postDataFunction) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const res = await postDataFunction("loginUser", { email, password });

  if (res && res.status === "success" && res.user) {
    const user = res.user;
    saveSession(user);
    redirectToDashboard(user.accountType);
  } else if (res) {
    showAuthAlert(res.message || "Login failed. Please check your credentials.", "error");
  } else {
    showAuthAlert("Connection error. Please try again.", "error");
  }
}

async function handleRegister(e, postDataFunction) {
  e.preventDefault();
  const firstName = document.getElementById("regFirstName").value.trim();
  const lastName = document.getElementById("regLastName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const res = await postDataFunction("registerUser", {
    firstName,
    lastName,
    email,
    password,
  });

  if (res && res.status === "success") {
    showAuthAlert(res.message, "success");
    toggleAuth("login");
    document.getElementById("registerForm").reset();
  } else if (res) {
    showAuthAlert(res.message, "error");
  }
}

function saveSession(user) {
  const sessionData = {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    accountType: user.accountType,
    timestamp: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

function getSession() {
  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) return null;
  try {
    return JSON.parse(sessionData);
  } catch (e) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function logout() {
  clearSession();
  // GitHub Pages structure: https://88emkay88.github.io/Fibre_Field_Ops/
  // From dashboards/agent/index.html -> go to repo root
  window.location.href = window.location.origin + "/Fibre_Field_Ops/";
}

function redirectToDashboard(accountType) {
  let dashboardPath;

  switch (accountType) {
    case "Employee":
      dashboardPath = "/Fibre_Field_Ops/dashboards/agent/index.html";
      break;
    case "Team Leader":
      dashboardPath = "/Fibre_Field_Ops/dashboards/leader/index.html";
      break;
    case "Super":
      dashboardPath = "/Fibre_Field_Ops/dashboards/admin/index.html";
      break;
    default:
      dashboardPath = "/Fibre_Field_Ops/dashboards/agent/index.html";
  }

  window.location.href = window.location.origin + dashboardPath;
}

function requireAuth(requiredRole = null) {
  const session = getSession();

  if (!session) {
    window.location.href = window.location.origin + "/Fibre_Field_Ops/";
    return false;
  }

  if (requiredRole && session.accountType !== requiredRole) {
    redirectToDashboard(session.accountType);
    return false;
  }

  return session;
}

function getCurrentUser() {
  return getSession();
}

function checkSession() {
  const session = getSession();
  if (!session) {
    window.location.href = window.location.origin + "/Fibre_Field_Ops/";
    return false;
  }
  return session;
}