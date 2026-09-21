# FibreGems Field Operations

A mobile-first field operations tracker for fiber sales agents and team leaders across South African fibrehoods.

## 🚀 Quick Start

### Local Development
1. Clone the repository
2. Open `index.html` in a browser


### Production Deployment
The application is automatically deployed to GitHub Pages when pushed to the `main` branch.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 📁 Project Structure

```
Fibre_Field_Ops/
├── index.html              # Main login page
├── dashboards/
│   ├── agent/              # Agent dashboard
│   │   ├── index.html
│   │   └── agent.js
│   ├── leader/             # Team Leader dashboard
│   │   ├── index.html
│   │   └── leader.js
│   └── admin/              # Super Admin dashboard
│       ├── index.html
│       └── admin.js
├── shared/                 # Shared components
│   ├── api.js             # API communication layer
│   ├── auth.js            # Authentication & session management
│   ├── styles.css         # Common styles
│   └── utils.js           # Shared utilities
└── DEPLOYMENT.md          # Deployment guide
```

## 🔐 Authentication

The application uses role-based authentication with three user types:
- **Employee**: Agent dashboard access
- **Team Leader**: Leader dashboard access
- **Super**: Admin dashboard access

Users are automatically redirected to their appropriate dashboard after login.

## 📱 Features

### Agent Dashboard
- Daily clock-in with GPS location
- Selfie photo verification
- Task notes and objectives
- Team leader selection

### Team Leader Dashboard
- Vehicle check-in with photos
- GPS location tracking
- Agent status management
- Performance notes

### Super Admin Dashboard
- Live team location map
- Agent and leader activity tracking
- KPI dashboards
- Calendar objective planning
- Photo verification

## 🛠 Technology Stack

- **Frontend**: HTML, CSS (Tailwind), JavaScript
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Maps**: Leaflet.js
- **Icons**: Lucide
- **Deployment**: GitHub Pages

## 📱 Mobile-First Design

The application is optimized for mobile devices with:
- Touch-friendly interface
- GPS integration
- Camera capture for photos
- Responsive layouts
- Offline capability planning

## 🔧 Configuration

### Google Apps Script
Update the API URL in `shared/api.js`:
```javascript
const APP_SCRIPT_URL = "your-google-apps-script-url";
```

### Environment Variables
For production, consider using environment variables for sensitive data.

## 🚀 Deployment

### GitHub Pages
The application is configured for automatic GitHub Pages deployment. See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Custom domain setup
- Security considerations
- Performance optimization
- Troubleshooting guide

## 📊 Google Sheets Backend

The application uses Google Sheets as a database with the following sheets:
- `Users`: User accounts and authentication
- `AgentSignOns`: Agent clock-in records
- `LeaderCheckIns`: Leader check-in records
- `Objectives`: Weekly objectives
- `AgentPerformance`: Performance tracking

## 🔒 Security

⚠️ **Important Security Notes**:
- API keys are currently exposed in frontend code
- Move API calls through a proxy server for production
- Implement proper authentication tokens
- Enable rate limiting on Google Apps Script

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is proprietary software for FibreGems.

## 📞 Support

For technical support, please contact the FibreGems development team.
