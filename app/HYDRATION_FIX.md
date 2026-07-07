# Hydration Mismatch Fix

## Problem
After SEO optimizations, a hydration error occurred:
```
Console Error: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```

**Root Cause**: JSON-LD `<script>` tags were placed directly in the JSX render using `dangerouslySetInnerHTML`, causing React to expect different HTML structure on server vs client during hydration.

## Solution
Replaced all inline `<script>` tags with Next.js `Script` component from `next/script` using `strategy="afterInteractive"`.

### Before (❌ Causes Hydration Mismatch)
```tsx
return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
    <Header />
  </>
);
```

### After (✅ Correct Approach)
```tsx
import Script from "next/script";

return (
  <>
    <Script
      id="unique-schema-id"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="afterInteractive"
    />
    <Header />
  </>
);
```

## Why This Works

- **`next/script`**: Next.js-specific component for script management
- **`strategy="afterInteractive"`**: Injects script after React hydration completes
- **`id` prop**: Unique identifier prevents duplicate script injection
- **No hydration mismatch**: Script is added after hydration, not during server render

## Files Fixed
1. `layout.tsx` - Organization + Website schemas
2. `[year][month][slug]/page.tsx` - Article + Breadcrumb schemas
3. `category/[slug]/page.tsx` - Category + Breadcrumb schemas
4. `author/[slug]/page.tsx` - Author + Breadcrumb schemas
5. `podcasts/page.tsx` - Podcast schema

## Best Practice
✅ **DO**: Use `next/script` for JSON-LD and other inline scripts
❌ **DON'T**: Place `<script>` tags directly in JSX with `dangerouslySetInnerHTML`

## Reference
- [Next.js Script Component Docs](https://nextjs.org/docs/app/api-reference/components/script)
- [React Hydration Documentation](https://react.dev/reference/react-dom/client/hydrateRoot)

---

**Fixed**: 2026-07-07
**Status**: ✅ Hydration errors resolved
