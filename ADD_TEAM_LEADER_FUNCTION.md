# Backend Functions & Sheet Schema Migration (`Code.gs`)

This guide provides:
1. **`migrateAndExtendSheets()`**: An automatic, non-destructive migration script that adds any missing columns to your existing Google Sheets.
2. **Dynamic read & write handlers**: For Objectives (`Target Houses`), `AgentSignOns`, and `AgentStats` (`Issue Type`, `Leader Name`, `Notes`).
3. **Team Leader Management**: `addTeamLeader` & `deleteTeamLeader`.

---

## 🚀 1. One-Click Sheet Migration Script

Add this function to `Code.gs` and run `migrateAndExtendSheets()` once from the Apps Script editor menu (or let it run automatically). It checks your existing headers and appends any missing columns without altering your existing data:

```javascript
/**
 * Run this function once from the Apps Script toolbar to automatically
 * add missing columns to your existing sheets without losing any data.
 */
function migrateAndExtendSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Objectives Sheet (supports either 'WeeklyObjectives' or 'Objectives')
  const objSheetName = ss.getSheetByName("Objectives") ? "Objectives" : "WeeklyObjectives";
  extendSheetHeaders(ss, objSheetName, [
    "Date", "View Type", "Target Date", "Leader Name",
    "Assigned Location", "Focus Areas", "Target Metrics", "Status", "Requested By",
    "Target Houses"
  ]);

  // 2. AgentSignOns Sheet
  extendSheetHeaders(ss, "AgentSignOns", [
    "Date", "Time", "Agent Name", "Leader Name", "Location",
    "Photo URL", "Is Late (After 10)", "GPS", "Location Detail", "Notes"
  ]);

  // 3. AgentStats Sheet (Extending with Time, Leader Name, Issue Type, Notes)
  extendSheetHeaders(ss, "AgentStats", [
    "Date", "Agent Name", "Engagements", "Real Leads", "Payments",
    "Consecutive Misses (Strikes)", "Time", "Leader Name", "Issue Type", "Notes"
  ]);

  // 4. LeaderCheckIns Sheet
  extendSheetHeaders(ss, "LeaderCheckIns", [
    "Date", "Time", "Leader Name", "Region", "Vehicle Info", "Photo URL", "GPS", "Location"
  ]);

  // 5. Users Sheet
  extendSheetHeaders(ss, "Users", [
    "Email", "First Name", "Last Name", "Password Hash", "Salt", "Account Type", "Status", "Reset Token"
  ]);

  clearCache();
  Logger.log("✅ All sheets checked and successfully extended!");
}

/**
 * Safely inspects Row 1 of target sheet and appends missing column headers
 */
function extendSheetHeaders(ss, sheetName, expectedHeaders) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(expectedHeaders);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
    Logger.log(`Created new sheet: ${sheetName}`);
    return;
  }

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

  const missingHeaders = [];
  expectedHeaders.forEach(h => {
    if (!currentHeaders.includes(h)) {
      missingHeaders.push(h);
    }
  });

  if (missingHeaders.length > 0) {
    const startCol = lastCol + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]).setFontWeight("bold");
    Logger.log(`Extended ${sheetName} with columns: ${missingHeaders.join(", ")}`);
  } else {
    Logger.log(`${sheetName} already has all required columns.`);
  }
}
```

---

## 📝 2. `doPost` Switch Statement

Ensure these actions are handled in your `doPost(e)`:

```javascript
switch (action) {
  case "loginUser":
    return createJsonResponse(loginUser(payload.email, payload.password));
  case "registerUser":
    return createJsonResponse(registerUser(payload.email, payload.firstName, payload.lastName, payload.password));
  case "addTeamLeader":
    return createJsonResponse(addTeamLeader(payload.firstName, payload.lastName, payload.email, payload.password, payload.accountType));
  case "deleteTeamLeader":
    return createJsonResponse(deleteTeamLeader(payload.email));
  case "submitAgentSignOn":
  case "submitAgentClockIn":
    return handleAgentSignOn(ss, payload);
  case "submitLeaderCheckIn":
    return handleLeaderCheckIn(ss, payload);
  case "setWeeklyObjective":
    return handleSetWeeklyObjective(ss, payload);
  case "requestObjective":
    return handleRequestObjective(ss, payload);
  case "approveObjective":
    return handleApproveObjective(ss, payload);
  case "logAgentStats":
  case "logAgentIssue":
    return handleLogAgentStats(ss, payload);
  default:
    return createJsonResponse({ status: "error", message: "Invalid action: " + action });
}
```

---

## 🎯 3. Objectives Handlers (with `Target Houses`)

```javascript
function handleSetWeeklyObjective(ss, payload) {
  const sheetName = ss.getSheetByName("Objectives") ? "Objectives" : "WeeklyObjectives";
  const sheet = ss.getSheetByName(sheetName);
  
  // Header: Date, View Type, Target Date, Leader Name, Assigned Location, Focus Areas, Target Metrics, Status, Requested By, Target Houses
  sheet.appendRow([
    new Date(),
    payload.viewType || "Week",
    payload.targetDate || "",
    payload.leaderName || "",
    payload.assignedLocation || "",
    payload.focusAreas || "",
    payload.targetMetrics || "",
    payload.status || "Published",
    payload.requestedBy || "Admin",
    payload.targetHouses || ""
  ]);

  clearCache();
  return createJsonResponse({ status: "success", message: "Objective published." });
}

function handleRequestObjective(ss, payload) {
  const sheetName = ss.getSheetByName("Objectives") ? "Objectives" : "WeeklyObjectives";
  const sheet = ss.getSheetByName(sheetName);

  sheet.appendRow([
    new Date(),
    payload.viewType || "Week",
    payload.targetDate || "",
    payload.leaderName || "",
    payload.assignedLocation || "",
    payload.focusAreas || "",
    payload.targetMetrics || "",
    "Pending",
    payload.leaderName || "Team Leader",
    payload.targetHouses || ""
  ]);

  clearCache();
  return createJsonResponse({ status: "success", message: "Objective request submitted." });
}
```

---

## ⚠️ 4. Agent Performance & Strike Records Handler

Matches your `AgentStats` layout:
`[Date, Agent Name, Engagements, Real Leads, Payments, Consecutive Misses (Strikes), Time, Leader Name, Issue Type, Notes]`

```javascript
function handleLogAgentStats(ss, payload) {
  let sheet = ss.getSheetByName("AgentStats");
  if (!sheet) {
    migrateAndExtendSheets();
    sheet = ss.getSheetByName("AgentStats");
  }

  sheet.appendRow([
    new Date(),
    payload.agentName || "",
    payload.engagements || "",
    payload.realLeads || "",
    payload.payments || "",
    payload.strikes || 0,
    formatTime(new Date()),
    payload.leaderName || "",
    payload.issueType || "Performance Note",
    payload.notes || ""
  ]);

  clearCache();
  return createJsonResponse({ status: "success", message: "Performance record saved." });
}
```

---

## 👥 5. Team Leader Deletion Function

```javascript
function deleteTeamLeader(email) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateUsersSheet(ss);
    const data = sheet.getDataRange().getValues();
    const emailLower = String(email || "").trim().toLowerCase();

    if (!emailLower) {
      return { status: "error", message: "Email is required." };
    }

    let deleted = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && String(data[i][0]).trim().toLowerCase() === emailLower) {
        sheet.deleteRow(i + 1);
        deleted = true;
        break;
      }
    }

    if (!deleted) {
      return { status: "error", message: "Team Leader not found." };
    }

    clearCache();
    return { status: "success", message: `Team Leader ${email} removed successfully.` };
  } catch (err) {
    return { status: "error", message: "Server error: " + err.toString() };
  }
}
```

---

## 📊 6. Reading Data in `getSuperAdminData` / `getPortalData`

Ensure your data mapper reads by headers or updated column indices:

```javascript
function getSuperAdminData(ss) {
  // Objectives
  const objSheet = ss.getSheetByName("Objectives") || ss.getSheetByName("WeeklyObjectives");
  const objectives = [];
  if (objSheet && objSheet.getLastRow() > 1) {
    const rows = objSheet.getRange(2, 1, objSheet.getLastRow() - 1, objSheet.getLastColumn()).getValues();
    rows.forEach((r, idx) => {
      objectives.push({
        rowIndex: idx + 2,
        date: r[0],
        viewType: r[1],
        targetDate: r[2],
        leaderName: r[3],
        assignedLocation: r[4],
        focusAreas: r[5],
        targetMetrics: r[6],
        status: r[7] || "Published",
        requestedBy: r[8] || "",
        targetHouses: r[9] || ""
      });
    });
  }

  // Agent Stats
  const statSheet = ss.getSheetByName("AgentStats");
  const agentStats = [];
  if (statSheet && statSheet.getLastRow() > 1) {
    const rows = statSheet.getRange(2, 1, statSheet.getLastRow() - 1, statSheet.getLastColumn()).getValues();
    rows.forEach(r => {
      agentStats.push({
        date: r[0],
        agentName: r[1],
        engagements: r[2],
        realLeads: r[3],
        payments: r[4],
        strikes: r[5] || 0,
        time: r[6] || "",
        leaderName: r[7] || "",
        issueType: r[8] || (r[5] ? `${r[5]} Strike(s)` : ""),
        notes: r[9] || ""
      });
    });
  }

  // Users -> Team Leaders List
  const usersSheet = ss.getSheetByName("Users");
  const teamLeadersList = [];
  if (usersSheet && usersSheet.getLastRow() > 1) {
    const uRows = usersSheet.getRange(2, 1, usersSheet.getLastRow() - 1, usersSheet.getLastColumn()).getValues();
    uRows.forEach(r => {
      if (String(r[5]).toLowerCase() === "team leader") {
        teamLeadersList.push({
          email: r[0],
          firstName: r[1],
          lastName: r[2],
          fullName: `${r[1]} ${r[2]}`.trim()
        });
      }
    });
  }

  return {
    status: "success",
    agents: getAgentDataRows(ss),
    leaders: getLeaderDataRows(ss),
    objectives: objectives.reverse(),
    agentStats: agentStats.reverse(),
    teamLeadersList: teamLeadersList
  };
}
```
