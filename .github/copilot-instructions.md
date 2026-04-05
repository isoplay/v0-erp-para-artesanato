# v0 ERP para Artesanato – Developer Guidelines

A Next.js 16 ERP for Brazilian religious craft businesses (rosaries, bracelets, keychains). Built on Supabase, Radix UI, and Tailwind CSS 4. Manages inventory, production, orders, and finances.

## Code Style & Conventions

- **Language**: TypeScript (strict mode). Build errors intentionally ignored in `next.config.mjs` — resolve linting errors manually.
- **UI Components**: Radix UI headless + Tailwind CSS 4.2. Import from `components/ui/`.
- **Forms**: React Hook Form + Zod for validation. See `app/dashboard/produtos/page.tsx` for pattern.
- **State & Data**: React hooks only (no Redux/Zustand). `useTransition()` for pending mutation states.
- **Formatting**: Locale defaults to `pt-BR` for dates, currency (non-configurable).
- **Icons**: lucide-react. Import as `import { SettingsIcon } from 'lucide-react'`.

## Architecture – Server/Client Separation

Each dashboard module (`/app/dashboard/[module]/`) follows a strict three-layer pattern:

```
[module]/
  ├─ page.tsx           # Async server component; calls actions.ts, renders -content.tsx
  ├─ actions.ts         # Server actions with 'use server'; wraps Supabase queries
  └─ [module]-content.tsx  # Client component; state, forms, mutations via useTransition
```

**Key Rules:**
- ✅ `page.tsx`: `async`, fetch data via server actions, pass as props to client component.
- ✅ `actions.ts`: Use `'use server'` pragma; always include error logging to console; return typed data (empty array on error).
- ✅ `*-content.tsx`: Manage local search, filters, modals; call server actions in `useTransition()`; handle pending/error states.
- ❌ **Do not** fetch in client components; use server actions instead.
- ❌ **Do not** store Supabase client globally; re-created per request (Fluid compute pattern for auth refresh).

**Error Handling**: Log to console, return empty collections, show Sonner toast for user feedback. Silent failures are acceptable during development.

## Database & Types

- **Schema**: PostgreSQL via Supabase. UUIDs as PKs, CASCADE deletes, computed columns for cost tracking.
- **Core Tables**: `materiais`, `produtos`, `pedido_itens`, `pedidos`, `despesas`, `movimentacoes_estoque`.
- **Types**: All exported from `lib/types/database.ts`. Import and use for type-safe queries.
- **Migrations**: SQL stored in `scripts/001_create_tables.sql`. Use Supabase dashboard to apply.

## Build & Test

```bash
pnpm install         # Use pnpm (not npm/yarn)
pnpm dev            # Start dev server at http://localhost:3000
pnpm build          # Next.js production build
pnpm start          # Run production server
pnpm lint           # ESLint check
```

No test suite currently configured.

## Key Files to Understand the Pattern

- [app/dashboard/page.tsx](../app/dashboard/page.tsx) – Dashboard root server component
- [app/dashboard/produtos/page.tsx](../app/dashboard/produtos/page.tsx) – Product module (full example)
- [app/dashboard/produtos/actions.ts](../app/dashboard/produtos/actions.ts) – Server actions pattern
- [app/dashboard/produtos/produtos-content.tsx](../app/dashboard/produtos/produtos-content.tsx) – Client component pattern
- [lib/types/database.ts](../lib/types/database.ts) – Centralized types
- [lib/supabase/client.ts](../lib/supabase/client.ts) – Client-side Supabase initialization

## Common Gotchas

1. **Build errors ignored**: Run `pnpm lint` manually to catch TypeScript issues; they won't block builds.
2. **Supabase auth**: Middleware refreshes session cookies on every request. Clients are recreated per request—do not cache globally.
3. **Silent failures**: Server actions log errors to console but return `[]`. Monitor console during dev; add toasts for user-facing errors.
4. **Revalidation**: Use `revalidatePath()` in server actions to trigger ISR after mutations. Check `app/dashboard/produtos/actions.ts` for examples.
5. **PWA mode**: Service worker is active. Hard-refresh browser (`Ctrl+Shift+R`) during dev to clear cache.

## References

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Radix UI Components](https://www.radix-ui.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [v0 Project](https://v0.app/chat/projects/prj_greNfFKkZf1NQ8YH82zNEu4Q3qCv)
