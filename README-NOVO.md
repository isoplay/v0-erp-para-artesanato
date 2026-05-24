# 🎨 ERP Artesanato - Next.js 16 + Supabase

> ERP para negócios de artesanato religioso. Gerencia estoque, produção, pedidos e finanças.

[![Status](https://img.shields.io/badge/status-PRONTO_PARA_RODAR-brightgreen)](/)
[![Node](https://img.shields.io/badge/node-18%2B-green)](/)
[![License](https://img.shields.io/badge/license-MIT-blue)](/)

---

## ✨ Mudanças Recentes (v2)

✅ **Estoque**: Upload de fotos para cada material  
✅ **Quantidade**: Edição direta de quantidade atual  
✅ **Pedidos**: Materiais customizáveis POR PEDIDO (não mais fixos)  
✅ **PWA**: Corrigido - app instala sem erro no celular  
✅ **Docs**: 6 guias de setup, testes e troubleshooting  

---

## 🚀 COMECE AQUI

### 📋 Ordem de Leitura Recomendada

1. **[PRE-REQUISITOS.md](PRE-REQUISITOS.md)** - 5 min
   - O que precisa instalar
   - Passo-a-passo Supabase
   - Checklist de verificação

2. **[SETUP.md](SETUP.md)** - 10 min
   - Como rodar pela primeira vez
   - Troubleshooting comum
   - Verificação pós-setup

3. **[ESTRUTURA.md](ESTRUTURA.md)** - 15 min
   - Entender organização do projeto
   - Onde fica cada coisa
   - Como adicionar features

4. **[CHANGELIST.md](CHANGELIST.md)** - 20 min
   - O que foi mudado e por quê
   - Antes vs depois
   - Impacto no usuário

5. **[TESTES.md](TESTES.md)** - 30 min
   - 10 testes funcionais
   - Validar que tudo funciona
   - Testar PWA em celular

6. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Consulta
   - Erros comuns e soluções
   - FAQ
   - Debug rápido

---

## 📦 Tech Stack

```
Frontend:
  • Next.js 16.2
  • React 19
  • TypeScript (strict)
  • Tailwind CSS 4.2
  • Radix UI (headless)

Backend:
  • Supabase (PostgreSQL)
  • Server Actions
  • Edge Functions (futuro)

Forms & Validation:
  • React Hook Form
  • Zod

Extras:
  • PWA (Service Worker)
  • Dark/Light Theme
  • Sonner (toasts)
  • Lucide Icons
```

---

## ⚡ Quick Start

```bash
# 1. Clonar/extrair projeto
cd v0-erp-para-artesanato-main

# 2. Instalar dependências
pnpm install    # ou: npm install

# 3. Criar .env.local
echo NEXT_PUBLIC_SUPABASE_URL=https://... >> .env.local
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=... >> .env.local

# 4. Rodar servidor local
pnpm dev        # ou: npm run dev

# 5. Abrir navegador
open http://localhost:3000
```

**⚠️ IMPORTANTE**: Antes de rodar, execute os migrations SQL no Supabase [Ver PRE-REQUISITOS.md](PRE-REQUISITOS.md)

---

## 📊 Funcionalidades

### Módulos Implementados

✅ **Estoque** (Inventário)
- CRUD de materiais
- Upload de fotos
- Rastreamento de quantidade
- Movimentações (entrada/saída)

✅ **Produtos** (Catálogo)
- CRUD de produtos
- Categorização
- Preços de venda
- Tempo de produção

✅ **Pedidos** (Vendas)
- Criar pedidos com clientes
- Adicionar itens do catálogo
- **NOVO**: Customizar materiais por pedido
- Acompanhar status

✅ **Financeiro** (Finanças)
- Registrar despesas
- Categorização
- Relatórios mensais

✅ **Calendário** (Agenda)
- Ver produção agendada
- Prazos de entrega

### Recursos do App

✅ Autenticação (Supabase Auth)  
✅ Responsivo (Mobile, Tablet, Desktop)  
✅ Tema Dark/Light  
✅ PWA (Instalar como app)  
✅ Offline (Cache básico)  
✅ Busca global  

---

## 🎯 Arquitetura (3 Camadas)

Cada módulo segue padrão consistente:

```
/dashboard/[modulo]/
├── page.tsx              ← Server Component
│   └─ Fetch data
│   └─ Pass props to client
│
├── actions.ts            ← Server Actions ('use server')
│   └─ Database queries
│   └─ Business logic
│   └─ Error handling
│
└── [modulo]-content.tsx  ← Client Component
    └─ UI/Forms
    └─ useTransition()
    └─ Call server actions
```

**Benefícios**:
- Type-safe end-to-end
- Secure (server logic hidden)
- Performant (no API layer)
- Easy to test

Veja exemplo completo: [app/dashboard/produtos/](app/dashboard/produtos/)

---

## 📁 Estrutura do Projeto

```
v0-erp-para-artesanato-main/
├── app/                 ← Next.js App Router
│   └── dashboard/       ← Area autenticada
│       ├── estoque/
│       ├── produtos/
│       ├── pedidos/
│       ├── financeiro/
│       └── calendario/
├── components/          ← Radix UI + custom
├── lib/                 ← Utilitários
│   ├── supabase/        ← Client/Server
│   └── types/           ← TypeScript types
├── public/              ← PWA assets
│   ├── manifest.json
│   └── sw.js
├── scripts/             ← SQL migrations
└── docs/                ← Esta documentação
```

Detalhado: [ESTRUTURA.md](ESTRUTURA.md)

---

## 🧪 Testes

### Validação Local

```bash
# Type checking
pnpm type-check    # ou: npm run type-check

# Linting
pnpm lint           # ou: npm run lint

# Build
pnpm build          # ou: npm run build

# Production test
pnpm build && pnpm start
```

### Testes Funcionais

Seguir: [TESTES.md](TESTES.md)

10 cenários:
1. Login/Autenticação
2. Estoque + foto
3. Produtos simplificado
4. Pedidos com materiais
5. Movimentações
6. Financeiro
7. PWA (celular)
8. Responsividade
9. Tema
10. Performance

---

## 🐛 Troubleshooting

### Erros Comuns

| Erro | Solução |
|------|---------|
| `Cannot find module` | `pnpm install` |
| `SUPABASE_URL undefined` | Criar `.env.local` |
| `Tabelas não existem` | Executar migrations SQL |
| `Storage 403` | Bucket deve ser PUBLIC |
| `Página branca` | Ver console (F12) |

Mais: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 📈 Development Workflow

### Modificar Código

```bash
pnpm dev
# → Salvar arquivo
# → Hot reload automático
# → Browser atualiza
```

### Adicionar Feature

1. Criar arquivo em `/app/dashboard/novo-modulo/`
2. Implementar 3-layer pattern
3. Adicionar rota em `components/app-sidebar.tsx`
4. Testar em browser

### Atualizar Banco

1. Criar migration em `scripts/`
2. Executar no Supabase SQL Editor
3. Atualizar tipos em `lib/types/database.ts`

---

## 🌍 Deploy (Futuro)

### Escolher Host

- **Vercel** (recomendado para Next.js)
- **Railway**
- **Render**

### Setup

1. Push para Git (GitHub/GitLab)
2. Conectar repo ao host
3. Configurar env vars (SUPABASE_URL, ANON_KEY)
4. Deploy automático

Supabase fica online automaticamente (sem deploy).

---

## 📝 Padrões de Código

### Server Actions

```typescript
// app/dashboard/produtos/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function getProdutos() {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
    
    if (error) {
      console.error('getProdutos:', error)
      return []
    }
    
    return data as Produto[]
  } catch (err) {
    console.error('getProdutos exception:', err)
    return []
  }
}
```

### Client Components with Forms

```typescript
// app/dashboard/produtos/produtos-content.tsx
'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { deleteProduct } from './actions'

export function ProdutosContent({ produtos }) {
  const [pending, startTransition] = useTransition()
  const form = useForm()
  
  function onSubmit(data) {
    startTransition(async () => {
      await deleteProduct(data.id)
      form.reset()
    })
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* form fields */}
      <button disabled={pending}>
        {pending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
```

---

## 🎓 Aprender Mais

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)

---

## 💬 FAQ

**P: Por onde começo?**  
R: Leia [PRE-REQUISITOS.md](PRE-REQUISITOS.md)

**P: Como testo no celular?**  
R: Veja seção "PWA" em [TESTES.md#testes-de-pwa-celular](TESTES.md#7-testes-de-pwa-celular)

**P: Posso customizar cores?**  
R: Sim! Veja `app/globals.css` e `tailwind.config.ts`

**P: É seguro?**  
R: Supabase tem RLS policies. ANON_KEY é pública por design.

**P: Quanto custa?**  
R: Supabase gratuito até 500K uploads/mês. Infinito read/write.

---

## 📞 Suporte

### Problem-Solving Checklist

- [ ] Ler a mensagem de erro completamente
- [ ] Consultar [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [ ] Verificar console do browser (F12)
- [ ] Limpar cache: `.next/` folder
- [ ] Restart: `pnpm dev` de novo
- [ ] Google: copiar erro + project name

### Onde Pedir Ajuda

1. Este README
2. [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. [TESTES.md](TESTES.md) (verificar expectativas)
4. Copilot / ChatGPT (colar error message)

---

## 📜 License

MIT © 2025

---

## ✅ Status

```
Code:          ✅ Pronto
Database:      ✅ Pronto
UI:            ✅ Pronto
PWA:           ✅ Pronto
Docs:          ✅ Pronto

=> TUDO PRONTO! 🚀
```

**Próximo passo**: [PRE-REQUISITOS.md](PRE-REQUISITOS.md)

---

<div align="center">

**Feito com ❤️ para artesãos**

Desenvolvido em Next.js 16 com ♥

</div>
