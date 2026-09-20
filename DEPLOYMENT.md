# FibreGems Field Operations - Deployment Guide

## GitHub Pages Deployment

### ✅ Current Setup
The current GitHub Pages workflow (`.github/workflows/static.yml`) is configured correctly and will work with the new folder structure.

### 🚀 Deployment Process
1. **Push to main branch**: The workflow automatically deploys on push to `main`
2. **Manual deployment**: Available via Actions tab → "Deploy static content to Pages" → "Run workflow"

### 🌐 URL Structure
Once deployed, your URLs will be:
- **Main login**: `https://yourusername.github.io/Fibre_Field_Ops/`
- **Agent dashboard**: `https://yourusername.github.io/Fibre_Field_Ops/dashboards/agent/`
- **Leader dashboard**: `https://yourusername.github.io/Fibre_Field_Ops/dashboards/leader/`
- **Admin dashboard**: `https://yourusername.github.io/Fibre_Field_Ops/dashboards/admin/`

### 🔧 GitHub Pages Settings
1. Go to repository **Settings** → **Pages**
2. **Source**: Select "GitHub Actions" (already configured in workflow)
3. **Branch**: Ensure it's set to deploy from `main` branch

## Custom Domain Setup (Optional)

### Option 1: Subdomain Routing
```
- fibregems.co.za → Main login
- agent.fibregems.co.za → Agent dashboard
- leader.fibregems.co.za → Leader dashboard
- admin.fibregems.co.za → Admin dashboard
```

### Option 2: Path Routing (Recommended)
```
- fibregems.co.za → Main login
- fibregems.co.za/agent/ → Agent dashboard
- fibregems.co.za/leader/ → Leader dashboard
- fibregems.co.za/admin/ → Admin dashboard
```

### Custom Domain Steps
1. **DNS Configuration**: Add CNAME records to your domain provider
2. **GitHub Pages Settings**: Add custom domain in repository Settings → Pages
3. **SSL Certificate**: GitHub automatically provisions SSL

## Google Apps Script Configuration

### API URL Setup
The Google Apps Script URL is configured in `shared/api.js`:
```javascript
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzoqUU8FO5eF3TUkiyfdurKfyGU1F56mH2hTcZ_10m9rD4qxcdRCw2hpmJcJi2pQNK9IQ/exec";
```

### CORS Considerations
- Google Apps Script supports CORS for external requests
- No additional configuration needed for GitHub Pages

### Security Notes
⚠️ **Important**: The API key is currently exposed in frontend code. For production:
1. Move API calls through a proxy server
2. Use environment variables for sensitive data
3. Implement proper authentication tokens

## Authentication Flow in Production

### GitHub Pages Path Handling
The authentication system (`shared/auth.js`) now handles GitHub Pages subdirectory structure automatically:
- Detects repository name from URL path
- Adjusts redirect paths accordingly
- Works for both local development and production

### Session Management
- Uses localStorage for session storage
- Sessions persist across dashboard navigation
- Logout clears session and redirects to login

## Mobile Optimization

### Mobile-First Features
- Touch-friendly targets (44px minimum)
- Optimized form inputs (16px font size)
- Responsive layouts for all screen sizes
- Smooth animations and transitions

### Testing Mobile
1. Use browser DevTools device emulation
2. Test on actual mobile devices
3. Verify touch interactions and GPS functionality

## Performance Optimization

### Current Optimizations
- Shared CSS/JS for caching
- Lazy loading of dashboard-specific scripts
- Optimized image handling with thumbnails
- Efficient API calls with caching

### Future Enhancements
- Service worker for offline support
- Progressive Web App (PWA) capabilities
- Advanced caching strategies
- Image optimization and CDN

## Troubleshooting

### Common Issues

**1. Logout redirects to 404**
- Check path resolution in `shared/auth.js`
- Verify GitHub Pages URL structure
- Check console logs for path debugging

**2. API calls failing**
- Verify Google Apps Script URL is correct
- Check Google Apps Script deployment status
- Ensure CORS is enabled in Google Apps Script

**3. Styles not loading**
- Verify CSS file paths in HTML
- Check GitHub Pages deployment logs
- Clear browser cache

**4. Mobile responsiveness issues**
- Test on actual devices
- Check viewport meta tag
- Verify mobile-specific CSS rules

## Monitoring and Analytics

### Recommended Additions
- Google Analytics integration
- Error tracking (Sentry, etc.)
- Performance monitoring
- User activity logging

## Backup and Recovery

### Data Backup
- Google Sheets data is backed up by Google
- Consider regular Google Sheets exports
- Implement database backup strategy if migrating

### Recovery Process
- Google Sheets has version history
- GitHub repository maintains code history
- GitHub Pages deployments can be rolled back

## Security Checklist

### Before Production Launch
- [ ] Remove debug console.log statements
- [ ] Implement proper API authentication
- [ ] Add rate limiting to Google Apps Script
- [ ] Enable HTTPS (automatic on GitHub Pages)
- [ ] Review and secure Google Apps Script permissions
- [ ] Implement content security policy if needed
- [ ] Add proper error handling and logging

## Support and Maintenance

### Regular Maintenance
- Monitor Google Apps Script quota usage
- Update dependencies periodically
- Review and optimize performance
- Check for security vulnerabilities

### Contact Information
- For GitHub Pages issues: GitHub Support
- For Google Apps Script issues: Google Workspace Support
- For domain issues: Domain provider support