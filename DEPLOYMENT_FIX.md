# GitHub Pages Deployment Fix — Blank White Screen

## Root Cause Analysis

The deployed VisionGuard AI website displayed a blank white screen due to **three critical issues**:

### Issue 1: Missing Base Path Configuration (PRIMARY CAUSE)
**Problem**: Vite was building assets with root-relative paths (`/assets/...`) but GitHub Pages serves the site from a subpath (`/vision-guard-ai/`).

**Impact**: When the browser loaded `https://muzamillp20-ai.github.io/vision-guard-ai/`, it tried to fetch:
- `/assets/index-xxx.js` → **404 Not Found**
- `/assets/index-xxx.css` → **404 Not Found**

Result: No JavaScript or CSS loaded → blank white screen.

**Fix**: Added `base` configuration to `vite.config.js`:
```javascript
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/vision-guard-ai/" : "/",
  // ...
}));
```

This ensures production builds generate correct paths:
- `/vision-guard-ai/assets/index-xxx.js` ✅
- `/vision-guard-ai/assets/index-xxx.css` ✅

### Issue 2: Deploy Step Never Executed
**Problem**: The GitHub Actions workflow had a conditional that prevented deployment:
```yaml
if: ${{ env.DEPLOY_TARGET == 'github-pages' }}
```

Since `DEPLOY_TARGET` was never set, the deploy step was **always skipped**.

**Fix**: Rewrote the workflow to use the official GitHub Pages deployment actions without conditionals:
- `actions/configure-pages@v4`
- `actions/upload-pages-artifact@v3`
- `actions/deploy-pages@v4`

### Issue 3: Insufficient Workflow Permissions
**Problem**: The workflow lacked required permissions for GitHub Pages deployment.

**Fix**: Added proper permissions:
```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

## Files Changed

1. **`vite.config.js`** — Added `base` path configuration
2. **`.github/workflows/frontend.yml`** — Fixed deployment workflow

## Verification

After the fix, the production build generates correct asset paths:

**Before (broken)**:
```html
<script type="module" src="/assets/index-xxx.js"></script>
<link rel="stylesheet" href="/assets/index-xxx.css">
```

**After (fixed)**:
```html
<script type="module" src="/vision-guard-ai/assets/index-xxx.js"></script>
<link rel="stylesheet" href="/vision-guard-ai/assets/index-xxx.css">
```

## Deployment Steps

1. **Commit the changes**:
   ```bash
   git add vite.config.js .github/workflows/frontend.yml
   git commit -m "Fix GitHub Pages deployment: add base path and fix workflow"
   git push origin main
   ```

2. **GitHub Actions will automatically**:
   - Build the production frontend with correct base paths
   - Upload the artifact
   - Deploy to GitHub Pages

3. **Verify deployment**:
   - Visit: `https://muzamillp20-ai.github.io/vision-guard-ai/`
   - Open browser DevTools → Network tab
   - Confirm all assets load with 200 status (not 404)
   - Check Console tab for any JavaScript errors

## Additional Notes

- **HashRouter**: The app uses HashRouter (`/#/routes`), which works perfectly with GitHub Pages without requiring server-side routing configuration or a `404.html` redirect.

- **Local Development**: The `base` path is only applied in production mode. Local development with `npm run dev` continues to work with `/` as the base path.

- **Backend Integration**: The frontend is configured to connect to the backend API. Update the `VITE_API_URL` environment variable in the workflow if you have a deployed backend.

## Testing Checklist

After deployment, verify:
- [ ] Page loads without blank screen
- [ ] CSS styles are applied correctly
- [ ] React app mounts (you should see the login page)
- [ ] Navigation works (click sidebar links)
- [ ] No 404 errors in Network tab
- [ ] No JavaScript errors in Console tab
- [ ] Camera permission prompt works when starting monitoring
- [ ] All features functional (incidents, analytics, zones, etc.)

## Rollback Plan

If issues persist after deployment:
1. Check GitHub Actions logs for build/deploy errors
2. Verify the `gh-pages` branch was created/updated
3. Check GitHub Pages settings in repository → Settings → Pages
4. Ensure "Deploy from a branch" is set to `gh-pages` branch, root directory

---

**Status**: ✅ Fixed and verified in production build
**Deployed URL**: https://muzamillp20-ai.github.io/vision-guard-ai/
