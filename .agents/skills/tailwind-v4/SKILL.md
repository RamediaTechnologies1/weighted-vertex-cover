---
name: tailwind-v4
description: >
  Tailwind CSS v4 with CSS-first configuration, shadcn/ui, and Radix UI. 
  Auto-apply when writing styles, creating UI components, or setting up design tokens.
  Don't use for: Tailwind v3 projects (check for tailwind.config.ts presence).
user-invocable: false
---

# Tailwind CSS v4 + shadcn/ui

## CSS-First Configuration (v4)

Tailwind v4 replaces `tailwind.config.ts` with CSS `@theme`:

```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(65% 0.25 160);       /* emerald */
  --color-primary-foreground: oklch(98% 0 0);
  --color-background: oklch(10% 0.01 264);     /* zinc-950 */
  --color-card: oklch(15% 0.01 264);           /* zinc-900 */
  --color-border: oklch(27% 0.01 264);         /* zinc-800 */
  --radius-md: 0.75rem;
}
```

## Critical v4 Changes

| v3 (Old) | v4 (New) |
|----------|----------|
| `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` |
| `tailwind.config.ts` | `@theme { }` in CSS |
| `w-6 h-6` | `size-6` (shorthand) |
| `bg-[#custom]` arbitrary values | Extend `@theme` instead |
| `forwardRef` | React 19 passes ref as prop |

## Do / Don't

✅ **Do:**
- Use `@import "tailwindcss"` as the entry point
- Use `@theme` for custom design tokens
- Use `size-*` shorthand for equal width/height
- Use semantic color tokens from theme
- Add ARIA attributes and focus states
- Test both light and dark themes

❌ **Don't:**
- Don't use `tailwind.config.ts` — CSS-first only
- Don't use `@tailwind` directives
- Don't use arbitrary values `[#hex]` — extend @theme
- Don't hardcode colors — use semantic tokens
- Don't forget `dark:` variants when needed

## shadcn/ui Integration

```bash
npx shadcn add button        # Add a component
npx shadcn add dialog card   # Add multiple
```

Import pattern:
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
```

## This Project's Theme

- Background: `bg-zinc-950` (body), `bg-zinc-900` (cards)
- Borders: `border-zinc-800`
- Text: `text-zinc-100` → `text-zinc-400` → `text-zinc-500`
- Accent: `text-emerald-400`, `bg-emerald-500/10`, `focus:border-emerald-500/50`
- Inputs: `bg-zinc-800 border-zinc-700 placeholder-zinc-500`
