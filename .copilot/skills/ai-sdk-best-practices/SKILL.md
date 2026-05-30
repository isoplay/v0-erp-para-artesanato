---
name: ai-sdk-best-practices
description: >-
  Implements AI features with Vercel AI SDK (latest): multi-provider setup in
  lib/ai/, streaming, fallbacks, model picker UX, tool calling with Zod, and
  RAG via Supabase pgvector. Use when adding chat, agents, completions, AI routes,
  or when the user mentions AI SDK, Vercel AI, streaming LLM, or model routing.
---

# AI SDK Best Practices

**AI SDK Best Practices:**

Use Vercel AI SDK (latest version) for all AI integrations.

## Preferred structure

- Create `/lib/ai/` folder
- Separate providers: `anthropic.ts`, `google.ts`, `openai.ts`

```
lib/ai/
├── anthropic.ts    # @ai-sdk/anthropic
├── google.ts       # @ai-sdk/google
├── openai.ts       # @ai-sdk/openai
├── router.ts       # fallback + model selection
├── tools.ts        # Zod-defined tools (shared)
└── index.ts        # public exports
```

Each provider file exports configured model factories (e.g. `claudeSonnet`, `geminiPro`). Keep API keys server-only via env vars.

## When creating AI features

- Always give the user option to choose the model/provider
- Implement fallback between providers
- Use streaming whenever possible
- Show thinking states and token usage when relevant
- Implement proper error handling and retries

### Feature checklist

- [ ] Model/provider selector in UI (persist preference in localStorage or user settings)
- [ ] `streamText` / `useChat` with incremental UI updates
- [ ] Fallback chain in `router.ts` (primary → secondary on rate limit/5xx)
- [ ] Exponential backoff retries (max 2–3) on transient errors
- [ ] Loading: skeleton or typing indicator; optional “thinking” for reasoning models
- [ ] Display token usage when billing/limits matter (footer or dev panel)
- [ ] User-safe error messages; log details server-side only

### Server route pattern

- API route or Server Action calls `streamText` / `generateText` from `lib/ai`
- Validate request body with Zod before invoking the model
- Never import provider clients in Client Components

## Popular Strong Combinations

- Claude 4 + Gemini 2.5 Pro (best quality/speed balance)
- Multi-model routing (intelligent model selection)
- Tool calling / function calling with Zod schemas
- RAG when needed (with Supabase pgvector)

### Multi-model routing

| Signal | Route to |
|--------|----------|
| Long context, architecture, code | Claude 4 |
| Vision, multimodal, fast draft | Gemini 2.5 Pro |
| User-selected override | Respect choice first |
| Primary failure | Next provider in fallback chain |

### Tool calling

Define tools with Zod parameters; pass to `streamText({ tools })`. Validate tool results before returning to the model.

### RAG (Supabase pgvector)

1. Embed query server-side
2. `match_documents` RPC or similarity search
3. Inject retrieved chunks into system/context
4. Stream answer with citations when UX requires sources

## Always prioritize

1. User experience
2. Cost efficiency
3. Speed
4. Quality (in that order when possible)

When goals conflict: prefer faster perceived UX (streaming, partial output) over marginal quality gains; route expensive models only when the task requires it.

## Related skill

Pair with `@premium-saas-fullstack` for Next.js stack, premium UI, and per-task model selection.
