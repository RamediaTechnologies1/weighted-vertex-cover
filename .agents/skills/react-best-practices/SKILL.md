---
name: react-best-practices
description: >
  React 19 performance patterns and composition. Auto-apply when writing React
  components, hooks, state management, or refactoring component architecture.
user-invocable: false
---

# React 19 Best Practices

## Component Patterns

### Prefer composition over prop drilling
```tsx
// ❌ Prop drilling
<Layout user={user} theme={theme} notifications={notifications}>
  <Sidebar user={user} notifications={notifications} />
</Layout>

// ✅ Composition
<Layout>
  <Sidebar>
    <UserInfo />
    <NotificationBell />
  </Sidebar>
</Layout>
```

### Keep components small and focused
- One component = one responsibility
- Extract sub-components when a component exceeds ~100 lines
- Colocate components with their pages when only used once

## Hooks Rules

- Only call hooks at the top level (never inside conditions/loops)
- Only call hooks from React functions (components or custom hooks)
- Custom hooks MUST start with `use`
- `useEffect` should have proper dependency arrays — no missing deps

## State Management

### Local state: `useState`
Use for UI state (open/closed, form inputs, toggles)

### Shared client state: Zustand
```tsx
"use client"
import { useAlertStore } from '@/lib/stores/alerts'

export function AlertButton() {
  const addAlert = useAlertStore((s) => s.addAlert)
  // ...
}
```

### Server state: Fetch in Server Components
Don't use client-side state for server data. Fetch in Server Components and pass as props.

## Performance

- Use `React.memo()` only when profiling shows re-render issues
- Avoid creating objects/arrays in render — memoize with `useMemo`
- Avoid creating functions in render — memoize with `useCallback`
- Use `key` prop correctly on lists — never use array index as key for dynamic lists
- Lazy load heavy components with `React.lazy()` or Next.js `dynamic()`

## React 19 Specifics

- `ref` is now a regular prop — no need for `forwardRef`
- `use()` hook can unwrap promises and contexts
- Actions and `useActionState` for form handling
- `useOptimistic` for optimistic UI updates

## Event Handlers

- Prefix with `handle`: `handleClick`, `handleSubmit`, `handleChange`
- For callbacks passed as props, prefix with `on`: `onClick`, `onSubmit`
- Always prevent default on form submissions: `e.preventDefault()`
