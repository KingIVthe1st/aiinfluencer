# 🚀 Deployment Workflow - AI Singer Studio

**Updated**: November 21, 2025 (Final)
**Status**: ✅ WORKING - Typography fixes complete

---

## Quick Deploy (Current Working Method)

```bash
cd /Users/ivanjackson/Desktop/soraveo/video-gen-platform/frontend

# 1. Build
npm run build

# 2. Deploy
wrangler pages deploy out --project-name=ai-singer-studio-frontend --commit-dirty=true
```

**Production URL**: https://ai-singer-studio-frontend.pages.dev
**Latest Working**: https://8235829b.ai-singer-studio-frontend.pages.dev (critical bug fixes + UI improvements)
**Previous**: https://a73de93f.ai-singer-studio-frontend.pages.dev (with social share card)

---

## What Was Fixed

### Problem
- Deployment missing CSS/JS assets (404 errors)
- Assets were in `/static/` but HTML referenced `/_next/static/`

### Solution
- Restructured deployment directory: `static/` → `_next/static/`
- Applied Typography fix (dark heading text)
- Deployed with correct Next.js structure

---

## Development Workflow

### Making Changes

```bash
# 1. Make your code changes
# Edit files in: app/, components/, lib/

# 2. Test locally
npm run dev
# Visit: http://localhost:3000

# 3. Build
npm run build

# 4. Test production build locally (optional)
npx serve out
# Visit: http://localhost:3000

# 5. Deploy
wrangler pages deploy out --project-name=ai-singer-studio-frontend --commit-dirty=true
```

### Typography Fix Applied
All headings now have dark text (`text-slate-900`) for visibility on white background.

### Social Share Card (Dai+Bed Branding)
- Platform rebranded from "AI Singer Studio" to "Dai+Bed"
- Social share image: `/public/og-image.png` (1200x630)
- Open Graph and Twitter Card metadata configured in `app/layout.tsx`
- metadataBase set to production URL for correct image resolution

---

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── dashboard/
│   │   ├── singers/       # Singer management
│   │   ├── music/         # Music/songs
│   │   └── ...
│   └── page.tsx           # Landing page
├── components/
│   └── ui/
│       └── Typography.tsx # ← Heading styles (fixed)
├── lib/                   # API clients, utilities
├── public/                # Static assets
├── out/                   # Build output (deploy this)
└── next.config.js         # Next.js configuration
```

---

## Configuration Files

### next.config.js (Current)
```javascript
{
  output: 'export',           // Static export
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  trailingSlash: true,
}
```

### Key Settings
- `output: 'export'` - Generates static `out/` directory
- `trailingSlash: true` - Better Cloudflare Pages routing
- `images.unoptimized` - Required for static export

---

## Troubleshooting

### Assets Not Loading (404)
```bash
# Verify _next directory exists
ls -la out/_next/static/

# Should show: chunks/, css/, media/
```

### Build Fails
```bash
# Clean and rebuild
rm -rf .next out node_modules
npm ci
npm run build
```

### Deployment Shows Old Version
```bash
# Cloudflare caches aggressively - wait 2-3 minutes
# Or use preview URL from deployment output
```

---

## Future: Cloudflare Adapter (Recommended)

For dynamic features (API routes, SSR), upgrade to Cloudflare adapter:

```bash
# Install adapter
npm install -D @cloudflare/next-on-pages

# Update next.config.js - remove 'output: export'

# Build with adapter
npx @cloudflare/next-on-pages

# Deploy
wrangler pages deploy .vercel/output/static --project-name=ai-singer-studio-frontend
```

**Benefits**:
- API routes work
- Server-side rendering
- Middleware support
- More robust asset handling

---

## Pre-Demo Checklist

- [ ] Site loads: https://ai-singer-studio-frontend.pages.dev
- [ ] All CSS/JS loading (check browser console)
- [ ] Headings are visible (dark text)
- [ ] Dashboard navigation works
- [ ] Singers page functional
- [ ] Music generation works
- [ ] No 404 errors in console

---

## Emergency Rollback

If deployment breaks:

```bash
# Use working deployment URL
https://79c89e7e.ai-singer-studio-frontend.pages.dev

# Or redeploy last working build
wrangler pages deploy deploy-fixed --project-name=ai-singer-studio-frontend
```

---

## Support

**Deployment Issues**: Check https://dash.cloudflare.com/pages
**Build Issues**: Run `npm run build` and check errors
**Asset Issues**: Verify `out/_next/static/` directory exists

---

**Ready for tomorrow's investor demo! 🎉**
