---
name: next-best-practices
description: >
  Next.js 16 App Router best practices. Auto-apply when writing or reviewing
  Next.js code: pages, layouts, API routes, server/client components, data fetching,
  metadata, images, fonts, error handling, and bundling.
user-invocable: false
---

# Next.js Best Practices (v16 App Router)

Read the relevant reference files below based on the task at hand.

## Server vs Client Components (RSC Boundaries)

**Default is Server Component.** Only add `"use client"` when you need:
- React hooks (useState, useEffect, useContext, etc.)
- Browser APIs (window, document, navigator, localStorage)
- Event handlers (onClick, onChange, onSubmit)
- Third-party client libraries (Zustand stores, Leaflet, etc.)

**Rules:**
- NEVER import server-only code (env vars, DB, fs, openai SDK) in `"use client"` files
- Push `"use client"` to the smallest leaf component possible
- Server Components CAN import Client Components (not vice versa for server-only code)
- Props passed from Server → Client must be serializable (no functions, Dates, Maps)

## File Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | Route UI (required for route to exist) |
| `layout.tsx` | Shared layout wrapping child pages |
| `loading.tsx` | Suspense fallback for the page |
| `error.tsx` | Error boundary (must be `"use client"`) |
| `not-found.tsx` | 404 UI |
| `route.ts` | API endpoint (GET, POST, PUT, DELETE, PATCH) |
| `template.tsx` | Like layout but re-mounts on navigation |

## Data Patterns

- **Server Components**: `async` component with direct `fetch()` or DB calls
- **Client Components**: `fetch('/api/...')` to internal API routes
- **Mutations**: Server Actions with `"use server"` or API routes
- **Revalidation**: `revalidatePath()` or `revalidateTag()` after mutations

## Route Handlers (API Routes)

```ts
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  // ... process
  return NextResponse.json({ result: '...' })
}
```

- Export named functions: GET, POST, PUT, DELETE, PATCH
- Cannot coexist with `page.tsx` in the same folder
- Run server-side only — safe for secrets and API keys

## Async Patterns (Next.js 15+)

- `params` and `searchParams` are now Promises — must `await` them:
  ```tsx
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
  }
  ```
- `cookies()` and `headers()` are async — must `await` them
- Use `React.use()` in client components to unwrap promises

## Dynamic Imports

For client-only libraries (Leaflet, etc.):
```tsx
import dynamic from 'next/dynamic'
const Component = dynamic(() => import('./component'), { ssr: false })
```

## Image Optimization

```tsx
import Image from 'next/image'
<Image src="/photo.jpg" alt="Description" width={800} height={600} />
```
- Always provide `width` and `height` (or use `fill` with a sized parent)
- Use `priority` for above-the-fold images
- Remote images require `remotePatterns` in `next.config.ts`

## Metadata

```tsx
export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
}
```
- Export from `page.tsx` or `layout.tsx` (Server Components only)
- Child metadata merges with/overrides parent metadata

## Common Hydration Error Fixes

- Don't render different content server vs client (use `useEffect` for client-only)
- Don't nest `<p>` inside `<p>`, `<div>` inside `<p>`, etc.
- Don't use `Date.now()` or `Math.random()` in render (non-deterministic)
- Browser extensions can modify DOM — use `suppressHydrationWarning` sparingly
