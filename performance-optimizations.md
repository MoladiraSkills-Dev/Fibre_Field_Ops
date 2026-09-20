# Performance Optimization Guide

## Loading Performance Issues & Solutions

### 1. Google Apps Script 404 Error

**Problem**: The current Google Apps Script URL is returning 404 errors.

**Solution**: 
1. **Redeploy Google Apps Script**:
   - Open your Google Apps Script project
   - Click "Deploy" → "Manage deployments"
   - Delete any existing deployments
   - Create new deployment:
     - Type: "Web app"
     - Description: "FibreGems Field Operations API"
     - Execute as: "Me" (your email)
     - Who has access: "Anyone" (CRITICAL for external access)
   - Copy the new URL and update `shared/api.js`

2. **Verify Deployment**:
   - Test the URL directly in browser
   - Should return: `{"status":"success","message":"API is active."}`

### 2. Tailwind CDN Removal

**Completed**: Replaced Tailwind CDN with custom CSS for production.

**Benefits**:
- No external dependency on Tailwind CDN
- Faster page load (no CDN request)
- Smaller bundle size
- Better performance on slow connections

### 3. Additional Performance Optimizations

#### A. Resource Loading
```html
<!-- Add to all HTML files in <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="dns-prefetch" href="https://unpkg.com" />
<link rel="dns-prefetch" href="https://script.google.com" />
```

#### B. Script Loading Optimization
```html
<!-- Defer non-critical scripts -->
<script src="shared/utils.js" defer></script>
<script src="shared/auth.js" defer></script>
<script src="shared/api.js" defer></script>
```

#### C. Image Optimization
- Use WebP format when possible
- Implement lazy loading for images
- Add proper image dimensions
- Use responsive images with srcset

#### D. Caching Strategy
```html
<!-- Add to HTML files -->
<meta http-equiv="Cache-Control" content="max-age=31536000, immutable">
```

#### E. Minification
- Minify CSS files
- Minify JavaScript files
- Remove console.log statements in production
- Remove unused CSS

### 4. Google Apps Script Performance

#### A. Caching Implementation
```javascript
// Add to code.gs
function doGet(e) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("api_response");
  
  if (cached) {
    return ContentService.createTextOutput(cached)
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Generate response
  const response = generateResponse();
  cache.put("api_response", JSON.stringify(response), 300); // 5 minutes
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
```

#### B. Pagination for Large Datasets
```javascript
// Add to code.gs
function getAgentData(page = 1, limit = 50) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AgentSignOns");
  const data = sheet.getDataRange().getValues();
  const start = (page - 1) * limit + 1;
  const end = Math.min(start + limit, data.length);
  
  return {
    data: data.slice(start, end),
    total: data.length,
    page: page,
    totalPages: Math.ceil(data.length / limit)
  };
}
```

### 5. Mobile Performance

#### A. Critical CSS Inline
```html
<!-- Inline critical CSS for above-the-fold content -->
<style>
  /* Critical CSS only */
  body { font-family: 'Inter', sans-serif; }
  .bg-[#faf8f3] { background-color: #faf8f3; }
</style>
```

#### B. Font Loading Optimization
```html
<!-- Use font-display: swap -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

#### C. Touch Optimization
```css
/* Add to shared/styles.css */
button, a, input, select, textarea {
  touch-action: manipulation;
}
```

### 6. GitHub Pages Performance

#### A. Enable Compression
GitHub Pages automatically compresses assets with gzip.

#### B. Use CDN for Static Assets
Consider using a CDN for:
- JavaScript libraries
- CSS frameworks
- Font files

#### C. Implement Service Worker
```javascript
// Create sw.js for offline capability
const CACHE_NAME = 'fibregems-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/shared/styles.css',
  '/shared/tailwind-replacements.css',
  '/shared/api.js',
  '/shared/auth.js',
  '/shared/utils.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});
```

### 7. Monitoring and Analytics

#### A. Performance Monitoring
```javascript
// Add to shared/utils.js
function logPerformance() {
  if ('performance' in window) {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page Load Time:', perfData.loadEventEnd - perfData.fetchStart);
    console.log('DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.fetchStart);
  }
}

window.addEventListener('load', logPerformance);
```

#### B. Error Tracking
```javascript
// Add to shared/api.js
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});
```

### 8. Build Process for Production

#### A. Package.json Setup
```json
{
  "name": "fibregems-field-ops",
  "version": "1.0.0",
  "scripts": {
    "build": "node build.js",
    "optimize": "npm run build && npm run minify",
    "minify": "cssnano shared/styles.css shared/styles.min.css && cssnano shared/tailwind-replacements.css shared/tailwind-replacements.min.css"
  },
  "devDependencies": {
    "cssnano": "^6.0.0",
    "terser": "^5.19.0"
  }
}
```

#### B. Build Script
```javascript
// build.js
const fs = require('fs');
const { minify } = require('terser');

// Minify JavaScript files
const jsFiles = [
  'shared/api.js',
  'shared/auth.js', 
  'shared/utils.js',
  'dashboards/agent/agent.js',
  'dashboards/leader/leader.js',
  'dashboards/admin/admin.js'
];

jsFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const result = minify(code);
  fs.writeFileSync(file.replace('.js', '.min.js'), result.code);
});
```

### 9. Implementation Priority

1. **HIGH PRIORITY** (Immediate):
   - Fix Google Apps Script 404 error
   - Add DNS prefetching
   - Implement script deferring

2. **MEDIUM PRIORITY** (Next sprint):
   - Add Google Apps Script caching
   - Implement pagination for large datasets
   - Add performance monitoring

3. **LOW PRIORITY** (Future):
   - Service worker implementation
   - Advanced build process
   - CDN integration

### 10. Testing Performance

#### A. Lighthouse Testing
```bash
# Install Lighthouse
npm install -g lighthouse

# Test your site
lighthouse https://your-site.com --view
```

#### B. WebPageTest
Use WebPageTest.org for detailed performance analysis.

#### C. Chrome DevTools
- Network tab: Analyze load times
- Performance tab: Identify bottlenecks
- Coverage tab: Find unused CSS/JS

## Expected Performance Improvements

After implementing these optimizations:
- **Initial Load**: 2-3 seconds faster
- **Time to Interactive**: 1-2 seconds faster  
- **First Contentful Paint**: 0.5-1 second faster
- **Mobile Performance**: 30-40% improvement
- **API Response Time**: 50-70% improvement with caching