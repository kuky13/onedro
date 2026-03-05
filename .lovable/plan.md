

## Performance Improvement Plan (Mobile Score: 72 → ~85+)

### Current Metrics
| Metric | Current | Target |
|---|---|---|
| FCP | 3.7s | < 2.5s |
| LCP | 5.2s | < 3.0s |
| Unused JS | 330 KiB | < 100 KiB |
| Images | 705 KiB wasted | < 50 KiB |

### Root Causes Found

1. **`useCompanyDataLoader` on landing page** (Index.tsx) — triggers dynamic import of `pdfUtils.ts` → `jspdf` → pulls the 271KB `vendor-pdf-excel` chunk on the landing page where it's never needed. It also fires Supabase queries for company data that are useless for non-logged users.

2. **Brand logos are massive PNGs** (Huawei 222KB, OPPO 168KB, LG 87KB, etc.) displayed at 35x35px. Total: ~705KB wasted.

3. **Supabase preconnect broken** — `crossorigin` attribute prevents it from being used for REST API calls (fetch without CORS credentials). PageSpeed flags it as "unused preconnect" and suggests 320ms LCP savings.

4. **CSS render-blocking** — 28KB CSS blocks rendering for 560ms. Can be partially mitigated with critical inline CSS for the landing page skeleton.

5. **Bot detection script in `<body>`** runs synchronously before React mounts.

### Plan

#### 1. Remove `useCompanyDataLoader` from `Index.tsx`
This is the biggest win. The landing page only needs `useAuth` to check if user is logged in, then redirects. Remove the import and the `companyLoading` condition. This prevents the entire `pdfUtils → jspdf` chain from loading on landing.

#### 2. Optimize brand logos — replace with tiny WebP/SVG versions
Create optimized versions of each logo at max 100x100px in WebP format (~2-5KB each instead of 30-222KB). Place in `public/logos/` as new files and update `Index.tsx` references. Estimated savings: **~700KB**.

Logos to optimize (current → target):
- Huawei: 222KB → ~3KB
- OPPO: 168KB → ~3KB
- LG: 87KB → ~2KB
- Motorola: 44KB → ~2KB
- Apple: 40KB → ~2KB
- Samsung: 37KB → ~2KB
- Realme: 30KB → ~2KB
- Vivo: 22KB → ~2KB
- Xiaomi: 10KB → ~1KB

Since I cannot create image files directly, I'll resize them via CSS and add `fetchpriority="low"` to deprioritize them. For real optimization, you'd need to upload smaller versions.

#### 3. Fix Supabase preconnect in `index.html`
Remove `crossorigin` from the Supabase preconnect link. The REST API uses `apikey` header, not CORS credentials, so `crossorigin` causes a mismatch. Estimated LCP savings: **320ms**.

#### 4. Add critical inline CSS in `index.html`
Add minimal inline styles for the loading skeleton / initial paint so the page shows something before the 28KB CSS loads.

#### 5. Move bot detection script to `defer` or after `#root`
The bot detection script currently runs before the `#root` div. Move it after or make it non-blocking.

### Files Modified

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Remove `useCompanyDataLoader` import and usage |
| `index.html` | Fix preconnect, add critical CSS, defer bot script |

### Expected Impact
- **~700KB less images** loaded (with proper logo optimization)
- **~270KB less JS** on landing (vendor-pdf-excel no longer pulled)
- **~320ms faster LCP** from working preconnect
- Mobile score: 72 → estimated ~85+

