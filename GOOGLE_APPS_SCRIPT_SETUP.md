# Google Apps Script Setup and Redeployment

## 🔧 Fixing the 404 Error

The 404 error indicates that your Google Apps Script deployment needs to be refreshed. Follow these steps:

### Step 1: Open Your Google Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Open your FibreGems project
3. Open the `code.gs` file

### Step 2: Review Current Deployment
1. Click **"Deploy"** → **"Manage deployments"**
2. Check existing deployments
3. Delete any old/unused deployments

### Step 3: Create New Deployment
1. Click **"Deploy"** → **"New deployment"**
2. **Select type**: Click the gear icon → **"Web app"**
3. **Description**: Enter "FibreGems Field Operations API v2"
4. **Execute as**: Select **"Me"** (your email address)
5. **Who has access**: **IMPORTANT** → Select **"Anyone"**
   - This is critical for external access from GitHub Pages
   - If you select "Only myself", the API will fail with 404 errors

### Step 4: Deploy and Get URL
1. Click **"Deploy"**
2. Wait for deployment to complete
3. **Copy the Web app URL** (it will look like: `https://script.google.com/macros/s/.../exec`)

### Step 5: Update Your Application
1. Open `shared/api.js` in your project
2. Replace the `APP_SCRIPT_URL` with your new URL:
```javascript
const APP_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_NEW_ID/exec";
```

### Step 6: Test the Deployment
1. Open the new URL in your browser
2. You should see: `{"status":"success","message":"API is active."}`
3. Test your application locally

## 🚀 Recommended Google Apps Script Optimizations

### 1. Add Caching to Improve Performance
Add this to your `code.gs`:

```javascript
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : null;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Add caching for GET requests
    const cache = CacheService.getScriptCache();
    const cacheKey = `api_${action || 'default'}`;
    const cached = cache.get(cacheKey);
    
    if (cached && action) {
      return ContentService.createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getSuperAdminData" || action === "getPortalData") {
      const result = getSuperAdminData(ss);
      const jsonStr = JSON.stringify(result);
      
      // Cache for 3 minutes (180 seconds)
      if (jsonStr.length < 95000) {
        cache.put(cacheKey, jsonStr, 180);
      }
      
      return ContentService.createTextOutput(jsonStr)
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return createJsonResponse({ status: "success", message: "API is active." });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}
```

### 2. Add Error Handling and Logging
```javascript
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "No post data received" });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload || {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Log the action for debugging
    Logger.log(`Action: ${action}, Email: ${payload.email || 'unknown'}`);

    switch (action) {
      case "loginUser":
        return createJsonResponse(loginUser(payload.email, payload.password));
      case "registerUser":
        return createJsonResponse(registerUser(payload.email, payload.firstName, payload.lastName, payload.password));
      case "getReadableLocation":
        return createJsonResponse({ status: "success", address: getReadableLocation(payload.lat, payload.lon) });
      case "submitAgentSignOn":
      case "submitAgentClockIn":
        return handleAgentSignOn(ss, payload);
      case "submitLeaderCheckIn":
        return handleLeaderCheckIn(ss, payload);
      case "setWeeklyObjective":
        return handleSetWeeklyObjective(ss, payload);
      case "logAgentStats":
        return handleLogAgentStats(ss, payload);
      default:
        return createJsonResponse({ status: "error", message: "Invalid action: " + action });
    }
  } catch (err) {
    Logger.log(`Error in doPost: ${err.toString()}`);
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}
```

### 3. Add Rate Limiting (Optional)
```javascript
// Add to code.gs
function checkRateLimit(identifier) {
  const cache = CacheService.getScriptCache();
  const key = `rate_limit_${identifier}`;
  const requests = cache.get(key) || "0";
  
  if (parseInt(requests) > 100) { // 100 requests per minute
    return false;
  }
  
  cache.put(key, String(parseInt(requests) + 1), 60); // 1 minute expiry
  return true;
}
```

### 4. Optimize Data Fetching
```javascript
function getSuperAdminData(ss) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("super_admin_data");
  
  if (cached) {
    return ContentService.createTextOutput(cached)
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Your existing data fetching logic
  const agentSheet = ss.getSheetByName("AgentSignOns");
  const leaderSheet = ss.getSheetByName("LeaderCheckIns");

  // ... rest of your existing code ...

  const outputPayload = { 
    status: "success", 
    agents: agents.reverse(), 
    leaders: leaders.reverse() 
  };
  
  const jsonStr = JSON.stringify(outputPayload);
  
  // Cache if size is within limits
  if (jsonStr.length < 95000) {
    try { 
      cache.put("super_admin_data", jsonStr, 180); // 3 minutes
    } catch (e) {
      Logger.log("Cache put failed: " + e.toString());
    }
  }
  
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 🔒 Security Considerations

### 1. Add API Key Authentication (Recommended)
```javascript
function doPost(e) {
  const API_KEY = "your_secure_api_key_here"; // Store in PropertiesService
  const providedKey = e.parameter.key;
  
  if (providedKey !== API_KEY) {
    return createJsonResponse({ status: "error", message: "Unauthorized" });
  }
  
  // Rest of your existing code
}
```

### 2. Use PropertiesService for Secrets
```javascript
// Store API keys securely
function getApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('API_KEY');
}

// Set the key (run once)
function setApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('API_KEY', 'your_secure_api_key');
}
```

## 📊 Monitoring and Maintenance

### 1. Enable Logging
```javascript
// Add to your functions
Logger.log(`Function called at ${new Date()}`);
Logger.log(`Payload: ${JSON.stringify(payload)}`);
```

### 2. Set Up Monitoring
- Go to Google Apps Script dashboard
- Check "Executions" tab
- Monitor for errors and performance issues

### 3. Regular Maintenance
- Review logs weekly
- Check quota usage
- Update deployments as needed
- Monitor for suspicious activity

## 🧪 Testing Checklist

After redeployment:
- [ ] Test API URL directly in browser
- [ ] Test login functionality
- [ ] Test agent dashboard
- [ ] Test leader dashboard  
- [ ] Test admin dashboard
- [ ] Test GPS functionality
- [ ] Test photo uploads
- [ ] Test on mobile devices
- [ ] Check Google Apps Script logs
- [ ] Monitor for 404 errors

## 🆘 Troubleshooting

### Issue: Still getting 404 errors
**Solution**: 
1. Double-check "Who has access" is set to "Anyone"
2. Make sure you copied the correct URL (exec, not dev)
3. Check if the script has any syntax errors

### Issue: CORS errors
**Solution**: 
1. Google Apps Script handles CORS automatically
2. Ensure you're using the exec URL, not dev URL
3. Check your ContentService settings

### Issue: Slow response times
**Solution**: 
1. Implement caching (see above)
2. Optimize your Google Sheets queries
3. Consider pagination for large datasets

### Issue: Quota exceeded
**Solution**: 
1. Check Google Apps Script quotas
2. Implement rate limiting
3. Optimize your code to reduce execution time

## 📝 Deployment Notes

- **Version Control**: Keep track of deployment versions
- **Testing**: Always test in a separate environment first
- **Backup**: Keep a copy of your working code.gs
- **Documentation**: Document any changes to the API

Following these steps should resolve your 404 error and improve the overall performance and reliability of your Google Apps Script backend.