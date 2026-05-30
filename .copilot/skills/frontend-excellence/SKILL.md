---
name: frontend-excellence
description: >-
  Premium frontend patterns with shadcn/ui, Tailwind, cn(), dark mode, skeletons,
  optimistic updates, dashboard keyboard shortcuts, and subtle Framer Motion. Use
  when building UI components, dashboards, forms, loading states, theming, or animations.
---

# Frontend Excellence Rules

**Frontend Excellence Rules:**

- Always use shadcn/ui components as base
- Customize them with Tailwind to match premium feel
- Create reusable UI blocks in `components/ui/`
- Use `cn()` utility for class merging
- Perfect dark mode support
- Loading skeletons everywhere
- Optimistic updates when possible
- Keyboard shortcuts support on dashboards

## shadcn + Tailwind

- Install via CLI; extend in `components/ui/` — do not edit `node_modules`
- Premium feel: generous padding, `rounded-lg`, subtle borders (`border-border/50`), soft shadows
- Semantic tokens only (`bg-background`, `text-muted-foreground`) — no hardcoded hex in components
- Compose primitives: `Card` + `Button` + `Badge`; avoid one-off inline styles

### `cn()` usage

```tsx
import { cn } from "@/lib/utils"

<div className={cn("base-classes", condition && "conditional", className)} />
```

Always forward `className` on reusable components for caller overrides.

## Dark mode

- `next-themes` with `class` strategy on `<html>`
- Test every new component in **both** themes before shipping
- Images/icons: use theme-aware assets or `dark:` variants

## Loading & data UX

| Pattern | When |
|---------|------|
| `<Skeleton />` | Initial page/section load |
| Spinner in button | Mutation in flight (save, submit) |
| Optimistic update | TanStack Query `onMutate` + rollback on error |
| Disabled + aria-busy | Prevent double-submit |

Every async list, card, table, and chart gets a skeleton matching final layout (no layout shift).

## Dashboard keyboard shortcuts

- Register with `useEffect` + `keydown` or a small hook (`useHotkeys`)
- Show `?` help modal listing shortcuts
- Common: `g d` dashboard, `g s` settings, `/` focus search, `Esc` close dialogs
- Never override browser/OS critical shortcuts; scope to app when input focused

### Shortcut checklist

- [ ] Document shortcuts in help modal
- [ ] Visual hint on first visit (optional toast)
- [ ] Shortcuts disabled when typing in inputs (unless intentional)

## Component organization

```
components/
├── ui/           # shadcn primitives + shared blocks
├── layout/       # sidebar, nav, page shell
└── features/     # domain-specific (e.g. billing-card)
```

Export feature components from feature folders; keep `ui/` generic and reusable.

## Ship checklist

- [ ] Responsive (mobile-first)
- [ ] Focus visible; labels on form fields
- [ ] Empty states with CTA
- [ ] Error states with retry
- [ ] Skeleton → content transition (no flash)

---

## Animation Rules

**Animation Rules:**

- Use Framer Motion
- Subtle and purposeful animations
- Prefer "just enough" motion (don't overdo)

### Motion defaults

| Use | Avoid |
|-----|--------|
| `fade` + `y: 8` on mount | Bouncing logos, excessive stagger |
| `whileInView` once for sections | Animating every list item on scroll |
| `layout` for reorder lists | Parallax on data tables |
| `AnimatePresence` for modals/drawers | Looping distractions |

- Duration: **150–300ms**; easing: `[0.25, 0.1, 0.25, 1]` or `easeOut`
- Wrap animated trees in `"use client"` only where needed
- **`prefers-reduced-motion`**: disable or replace with instant transitions

```tsx
const prefersReduced = useReducedMotion()
<motion.div animate={prefersReduced ? {} : { opacity: 1, y: 0 }} />
```

## Related skills

- `@premium-saas-fullstack` — stack and design philosophy
- `@saas-features-excellence` — dashboard layout and landing pages
