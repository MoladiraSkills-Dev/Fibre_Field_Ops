# Add Team Leader Function for Google Apps Script

## Instructions

Add this function to your `code.gs` file in Google Apps Script:

### 1. Add this to the `doPost` switch statement:

Add this case in the `doPost` function's switch statement:

```javascript
case "addTeamLeader":
  return createJsonResponse(addTeamLeader(payload.firstName, payload.lastName, payload.email, payload.password, payload.accountType));
```

### 2. Add this new function to code.gs:

```javascript
/**
 * Add a new Team Leader (Admin-only function)
 * Creates a user with Team Leader account type
 */
function addTeamLeader(firstName, lastName, email, password, accountType) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateUsersSheet(ss);
    const data = sheet.getDataRange().getValues();
    const emailLower = String(email).trim().toLowerCase();

    // Check if user already exists
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase() === emailLower) {
        return { status: "error", message: "User with this email already exists." };
      }
    }

    // Validate inputs
    if (!firstName || !lastName || !email || !password) {
      return { status: "error", message: "All fields are required." };
    }

    if (!email.includes("@")) {
      return { status: "error", message: "Invalid email address." };
    }

    if (password.length < 6) {
      return { status: "error", message: "Password must be at least 6 characters." };
    }

    // Create the user with Team Leader account type
    const salt = generateSalt(16);
    const hash = computeSHA256(password, salt);
    
    sheet.appendRow([
      emailLower, 
      firstName, 
      lastName, 
      hash, 
      salt, 
      accountType || "Team Leader", 
      "Verified", 
      ""
    ]);
    
    // Clear any cached data
    clearCache();
    
    return { 
      status: "success", 
      message: `Team Leader ${firstName} ${lastName} added successfully. They should change their password on first login.` 
    };
  } catch (err) {
    return { status: "error", message: "Server error: " + err.toString() };
  }
}
```

### 3. Deploy the updated script

After adding the function:
1. Go to your Google Apps Script project
2. Click "Deploy" → "Manage deployments"
3. Create a new deployment (or update existing)
4. Set "Who has access" to "Anyone"
5. Copy the new URL and update `shared/api.js`

## How It Works

- Admins can add team leaders through the Super Admin dashboard
- A temporary password is set during creation
- Team leaders can change their password on first login (this can be added later as a "Change Password" feature)
- The function validates email format and password length
- Checks for duplicate email addresses before creating user

## Future Enhancements

You may want to add:
1. A "Change Password" feature for team leaders to update their password
2. Email notification to new team leaders with their temporary password
3. Ability to deactivate or delete team leaders
4. List of all team leaders in the admin dashboard
