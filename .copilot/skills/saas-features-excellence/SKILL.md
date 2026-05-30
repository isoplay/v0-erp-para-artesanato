---
name: saas-features-excellence
description: >-
  Builds production SaaS features with premium UX—auth, billing, onboarding,
  multi-tenancy, RBAC, dashboards, settings, analytics, and high-converting
  landing pages with Framer Motion. Use when implementing auth, Stripe, workspaces,
  roles, notifications, dashboard layout, settings tabs, or marketing landing pages.
---

# Common SaaS Features (build with excellence)

**Common SaaS Features (build with excellence):**

## Feature catalog

- Authentication (Supabase Auth + Magic Links + Social)
- Billing (Stripe + Lemon Squeezy)
- Onboarding flow (multi-step, beautiful)
- Team workspaces / multi-tenancy
- Role-based access control (RBAC)
- Activity logs and notifications
- Beautiful dashboard layout (sidebar + top nav)
- Settings pages with tabs
- Usage & billing analytics

## Implementation standards

### Authentication (Supabase)

- Magic link + OAuth (Google/GitHub) via Supabase Auth UI or custom shadcn forms
- Session in middleware; protect `/app/*` routes
- `profiles` table synced on signup trigger; avatar + display name
- [ ] Email verification flow; [ ] password reset; [ ] redirect after login

### Billing

| Provider | Use when |
|----------|----------|
| **Stripe** | Full control, usage-based, enterprise |
| **Lemon Squeezy** | Faster setup, MoR/tax handled |

- Checkout + Customer Portal webhooks (`checkout.session.completed`, `subscription.updated`)
- Store `subscription_status`, `plan_id`, `customer_id` on `organizations` or `users`
- Gate features by plan; show upgrade prompts in-app

### Onboarding

- 3–5 steps max; progress indicator; skip only where safe
- Collect minimum viable data; defer advanced setup to settings
- Celebrate completion (micro-animation); redirect to dashboard empty state

### Multi-tenancy & RBAC

- `organizations` (workspace) + `members` join with `role`: `owner` | `admin` | `member`
- RLS: every row scoped by `organization_id`; policies check `auth.uid()` membership
- UI: workspace switcher in sidebar; invite by email; pending invites table
- Permission checks server-side on every mutation (never client-only)

### Activity & notifications

- `activity_logs`: `actor_id`, `action`, `resource_type`, `metadata`, `created_at`
- In-app bell + optional email (Resend/Supabase); mark read; paginate
- Show human-readable messages (“João invited Maria to Acme”)

### Dashboard layout

```
┌──────────┬─────────────────────────────────┐
│ Sidebar  │ Top nav (breadcrumb, user menu) │
│ (nav)    ├─────────────────────────────────┤
│          │ Main content (max-w, padding)     │
└──────────┴─────────────────────────────────┘
```

- Collapsible sidebar on mobile (sheet); active route highlight
- Consistent page header: title, description, primary CTA right-aligned

### Settings (tabbed)

Tabs: **Profile** | **Team** | **Billing** | **Notifications** | **API** (if applicable)

- URL sync: `/settings?tab=billing` or `/settings/billing`
- Destructive actions (delete account) in danger zone at bottom

### Usage & billing analytics

- Charts: MRR, active users, API calls vs plan limits
- TanStack Query + lightweight chart lib; server aggregates for heavy metrics
- Export CSV for admins; empty states with upgrade CTA

## Feature ship checklist

- [ ] Loading, empty, and error states on every surface
- [ ] Mobile-responsive; keyboard accessible
- [ ] Server validation (Zod); RLS on all tenant data
- [ ] Audit log entry for sensitive actions

---

## Landing Page Rules

**Landing Page Rules:**

- Hero section extremely strong
- Social proof, features, pricing, FAQ
- High conversion focus
- Use Framer Motion for smooth animations

### Landing structure (top → bottom)

1. **Nav** — logo, links, primary CTA (Sign up)
2. **Hero** — outcome headline, subhead, dual CTA (Start free / Demo), product visual
3. **Social proof** — logos, testimonial carousel, metrics (“10k+ users”)
4. **Features** — 3–6 cards with icon, title, benefit (not feature dump)
5. **Pricing** — 2–3 tiers, highlighted recommended, annual toggle
6. **FAQ** — accordion, objection handling
7. **Final CTA** — repeat hero promise + button
8. **Footer** — legal, social, minimal links

### Hero requirements

- One clear value proposition (< 12 words headline)
- Subhead explains *how* in one sentence
- Primary CTA above fold; contrasting color; no competing links
- Product screenshot or interactive demo (not stock art)

### Conversion & motion

- Single primary action per section; sticky nav CTA on scroll
- Framer Motion: `fadeInUp` on scroll (`whileInView`, `viewport: { once: true }`)
- Respect `prefers-reduced-motion`; keep animations < 400ms
- Fast LCP: optimize hero image, avoid layout shift

### Landing checklist

- [ ] Meta title/description, OG image
- [ ] Pricing links to checkout or signup with plan param
- [ ] FAQ addresses pricing, security, cancellation
- [ ] Lighthouse: performance + accessibility pass

## Related skills

- `@premium-saas-fullstack` — stack, design system, code quality
- `@ai-sdk-best-practices` — AI-powered product features
