# 🔄 FLUXO DE DADOS DO APP - VISUAL

## 🔐 1. AUTENTICAÇÃO (Login/Signup)

```
┌─────────────────┐
│   User (Web)    │
└────────┬────────┘
         │ Digita email + senha
         ↓
┌─────────────────────────────────┐
│   app/page.tsx (Login Form)     │
│   email + password submit       │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   supabase/client.ts            │
│   signUp() / signIn()           │
└────────┬────────────────────────┘
         │ Hash + send to Supabase
         ↓
┌─────────────────────────────────┐
│   🔒 Supabase Auth              │
│   (PostgreSQL users table)      │
└────────┬────────────────────────┘
         │ ✅ Success / ❌ Error
         ↓
┌─────────────────────────────────┐
│   middleware.ts                 │
│   Refresh auth cookie           │
│   Update session                │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   /dashboard (ISR)              │
│   ✅ User authenticated!        │
└─────────────────────────────────┘
```

---

## 📊 2. FLUXO ESTOQUE (Com Upload de Foto)

### A) Criar Material com Foto

```
┌────────────────────────────────────┐
│   EstoqueContent (Client)          │
│   - Form com input file            │
│   - handleImageChange()            │
│   - Preview image local            │
└────────┬─────────────────────────┘
         │ User clica "Salvar"
         │ FormData com arquivo
         ↓
┌────────────────────────────────────┐
│   useTransition()                  │
│   pending = true                   │
│   Desabilita botão (UX)            │
└────────┬─────────────────────────┘
         │
         │ form data incluindo File
         ↓
┌────────────────────────────────────┐
│   createMaterial() (server action) │
│   1. Upload foto:                 │
│      uploadImagemMaterial(file)   │
└────────┬─────────────────────────┘
         │
         │ arquivo + nome.ext
         ↓
┌────────────────────────────────────┐
│   supabase/client.ts               │
│   storage.from('imagens-estoque')  │
│   .upload(path, file)              │
└────────┬─────────────────────────┘
         │
         │ arquivo enviado (< 5MB)
         ↓
┌────────────────────────────────────┐
│   🌍 Supabase Storage              │
│   (Bucket: imagens-estoque)        │
│   Arquivo: /materiais/uuid.jpg     │
└────────┬─────────────────────────┘
         │ ✅ Success
         │ ReturnS: publicUrl
         ↓
┌────────────────────────────────────┐
│   createMaterial() continua        │
│   2. INSERT no banco:              │
│      db.from('materiais')          │
│      .insert({                     │
│        nome, unidade,              │
│        imagem_url: URL_publica,    │
│        ...                         │
│      })                            │
└────────┬─────────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│   🗄️  PostgreSQL (Supabase)        │
│   Tabela: materiais                │
│   Row criada com imagem_url        │
└────────┬─────────────────────────┘
         │ ✅ Success
         │ Retorna: {id, nome, ...}
         ↓
┌────────────────────────────────────┐
│   revalidatePath()                 │
│   /dashboard/estoque               │
└────────┬─────────────────────────┘
         │ ISR: page.tsx re-executa
         │ Fetch dados novamente
         ↓
┌────────────────────────────────────┐
│   EstoqueContent (re-render)       │
│   ✅ Novo material aparece!        │
│   ✅ Foto visível com preview      │
│   pending = false                  │
│   Botão reabilita                  │
└────────────────────────────────────┘
```

### B) Editar Quantidade Atual

```
┌────────────────────────────┐
│   EstoqueContent           │
│   Clica "Editar"           │
│   Dialog abre              │
│   ✅ NOVO: Qtd Atual editar│
└────────┬───────────────────┘
         │ User muda:
         │ quantidade_atual: 50 → 30
         │ Clica "Salvar"
         ↓
┌──────────────────────────────────┐
│   updateMaterial() NOVO PARAM   │
│   {                              │
│     id, nome, ...,               │
│     quantidade_atual: 30          │ ← NOVO!
│   }                              │
└────────┬──────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│   db.from('materiais')           │
│   .update({quantidade_atual: 30})│
│   .eq('id', material_id)         │
└────────┬──────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│   ✅ Supabase atualiza banco     │
│   revalidatePath()               │
│   UI atualiza                    │
└──────────────────────────────────┘
```

---

## 🛍️ 3. FLUXO PRODUTOS (Simplificado - SEM Materiais Fixos)

```
┌─────────────────────────────────┐
│   ProdutosContent               │
│   Clica "+ Novo Produto"        │
│   Dialog: Novo Produto          │
└────────┬──────────────────────┘
         │ Form:
         │ - nome: "Terço Cristal"
         │ - categoria: "Terço"
         │ - preco_venda: 49.90
         │ - tempo_producao: 30
         │
         │ ❌ REMOVIDO: 
         │   Seleção de materiais!
         │
         ↓
┌─────────────────────────────────┐
│   createProduto() SIMPLIFICADO  │
│   Não tem param "materiais"     │
│   (Antes tinha!)                │
└────────┬──────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   db.from('produtos')           │
│   .insert({                     │
│     nome, categoria,            │
│     preco_venda,                │
│     tempo_producao,             │
│     custo_producao: 0           │
│   })                            │
│   ❌ Não insere em              │
│      produto_materiais          │
└────────┬──────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   ✅ Produto criado             │
│   💡 Materiais serão             │
│      configurados POR PEDIDO    │
└─────────────────────────────────┘
```

---

## 📦 4. FLUXO PEDIDOS (NOVO - Materiais Por Item)

### A) Criar Pedido

```
┌──────────────────────────────┐
│   PedidosContent             │
│   Clica "+ Novo Pedido"      │
│   Dialog abre                │
└────────┬─────────────────────┘
         │ Form:
         │ - cliente
         │ - email
         │ - telefone
         │ - endereço
         │ - data_entrega
         ↓
┌──────────────────────────────┐
│   Tab 1: Dados Cliente       │
│   Tab 2: Itens do Pedido     │
│   + Botão: Adicionar Item    │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│   User clica: Add Item       │
│   Modal: Selecionar Produto  │
│   Escolhe: Terço Cristal     │
│   Qtd: 2                     │
│   Preço Unit: 49.90          │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│   Item adicionado à tabela   │
│   Pode remover ou editar     │
│   Clica: Finalizar Pedido    │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│   createPedido()             │
│   1. Insert em pedidos       │
│   2. For each item:          │
│      Insert em pedido_itens  │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│   ✅ Pedido criado!          │
│   Status: Pendente           │
│   Pronto para customizar     │
└──────────────────────────────┘
```

### B) Customizar Materiais do Item (NOVO!)

```
┌──────────────────────────────────────┐
│   PedidosContent                     │
│   Expandir Pedido                    │
│   Clicar Item: "Terço Cristal"       │
│   ✨ Novo button: "Materiais"        │
└────────┬─────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│   Modal: Definir Materiais           │
│   Mostrar lista de materiais         │
│   ✓ Contas de Cristal (estoque: 100) │
│   ✓ Fio de Nylon (estoque: 50)       │
│   ✓ Fechos (estoque: 30)             │
│                                      │
│   Usuário marca os que vai usar      │
│   E quantidade de cada um            │
└────────┬─────────────────────────────┘
         │ Clica: Salvar
         ↓
┌──────────────────────────────────────┐
│   addMateriaisAoPedidoItem()          │
│   ✨ NOVO! (não existia antes)       │
│   For each material:                 │
│   INSERT em pedido_itens_materiais   │
│   {                                  │
│     pedido_item_id: uuid,            │
│     material_id: uuid,               │
│     quantidade: 50                   │
│   }                                  │
└────────┬─────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│   🗄️ Supabase                        │
│   Tabela: pedido_itens_materiais     │
│   ✨ Tabela NOVA! (migration #2)    │
│                                      │
│   Rows criadas:                      │
│   - pedido_item_1 → material_A × 50  │
│   - pedido_item_1 → material_B × 30  │
│   - pedido_item_1 → material_C × 5   │
└────────┬─────────────────────────────┘
         │ ✅ Success
         │ Cada item tem composição
         │ DIFERENTE!
         ↓
┌──────────────────────────────────────┐
│   ✅ Pedido 100% customizado!       │
│                                      │
│   Antes: Todos terços igual          │
│   Depois: CADA UM PODE SER           │
│           TOTALMENTE DIFERENTE!      │
└──────────────────────────────────────┘
```

---

## 🌍 5. FLUXO PWA (App Mobile)

```
┌─────────────────────────────────┐
│   User no Celular               │
│   Chrome / Safari               │
│   Acessa: https://exemplo.com   │
└────────┬─────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   Browser faz REQUEST           │
│   GET /manifest.json            │
└────────┬─────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   public/manifest.json          │
│   ✨ NOVO: Inline SVG icons     │
│   ✨ NOVO: scope: "/"           │
│   ✨ NOVO: Maskable icons       │
│   ✨ NOVO: Screenshots          │
│                                 │
│   Antes: Referenciava /logo.jpg │
│           (❌ 403 error!)       │
│                                 │
│   Depois: SVG inline            │
│           (✅ Sempre funciona!) │
└────────┬─────────────────────────┘
         │ Chrome detecta PWA
         │
         ↓
┌─────────────────────────────────┐
│   Chrome Menu (⋮)               │
│   "Instalar app"                │
│   User clica                    │
└────────┬─────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   public/sw.js                  │
│   Service Worker ativa          │
│   ✨ NOVO: Cache minimalista    │
│   ✨ NOVO: Network-first        │
│                                 │
│   Antes: Cache ['/dashboard',   │
│           '/dashboard/produtos' │
│           ... 10+ rotas]        │
│           ❌ Erro tamanho!      │
│                                 │
│   Depois: Cache apenas ['/']    │
│           ✅ Funciona!          │
└────────┬─────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   App instalado na tela         │
│   ✅ Modo standalone            │
│   ✅ Sem URL bar                │
└────────┬─────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   Usar app normal               │
│   Online: Trabalha + syncro     │
│   Offline: Cache básico         │
│   Reconecta: Sincroniza dados   │
└─────────────────────────────────┘
```

---

## 📊 6. ARQUITETURA GERAL DO SISTEMA

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                    │
│                                                         │
│   ┌────────────────────────────────────────────────┐   │
│   │   React Components + Tailwind UI              │   │
│   │   ┌──────────────────────────────────────┐    │   │
│   │   │ EstoqueContent  (Client)             │    │   │
│   │   │ ProdutosContent (Client)             │    │   │
│   │   │ PedidosContent  (Client)             │    │   │
│   │   │ ...                                  │    │   │
│   │   └──────────────────────────────────────┘    │   │
│   │                                                │   │
│   │   Forms + Validação (React Hook Form)        │   │
│   │   State (useTransition, useState)            │   │
│   │   Pending states + loading spinners          │   │
│   └────────────────────────────────────────────────┘   │
│                         ↓                              │
│            Chama Server Actions →                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ HTTP POST (Next.js)
                         ↓
┌────────────────────────────────────────────────────────┐
│              SERVIDOR (Next.js SSR)                     │
│                                                        │
│   ┌──────────────────────────────────────────────┐    │
│   │ Server Actions (use server)                 │    │
│   │ ┌────────────────────────────────────────┐  │    │
│   │ │ actions.ts de cada módulo:             │  │    │
│   │ │  getMateriais()                        │  │    │
│   │ │  createMaterial()                      │  │    │
│   │ │  uploadImagemMaterial()                │  │    │
│   │ │  getProdutos()                         │  │    │
│   │ │  getPedidos()                          │  │    │
│   │ │  addMateriaisAoPedidoItem()       ✨    │  │    │
│   │ │  ...                                   │  │    │
│   │ └────────────────────────────────────────┘  │    │
│   │                                              │    │
│   │ Error Handling:                             │    │
│   │ - Log to console                           │    │
│   │ - Return empty array/null on error         │    │
│   │ - Silent failures (OK em dev)             │    │
│   └──────────────────────────────────────────────┘    │
│                     ↓                                  │
│      Supabase Client (lib/supabase/*)                │
└────────────────────┬───────────────────────────────────┘
                     │ PostgreSQL Queries
                     ↓
┌────────────────────────────────────────────────────────┐
│       🗄️  BANCO DE DADOS (Supabase)                   │
│                                                        │
│   PostgreSQL Tables:                                  │
│   ├─ materiais ( ← imagem_url NOVO!)                 │
│   ├─ produtos                                        │
│   ├─ pedidos                                         │
│   ├─ pedido_itens                                    │
│   ├─ pedido_itens_materiais  (← NOVO junction!)    │
│   ├─ despesas                                        │
│   ├─ movimentacoes_estoque                          │
│   └─ auth.users (Supabase Auth)                     │
│                                                        │
│   Storage:                                            │
│   └─ imagens-estoque bucket (fotos)                 │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 7. CICLO DE UMA OPERAÇÃO (CRUD)

```
CREATE (Novo Item)
└─ Cliente form → Server Action → DB insert → revalidatePath() → UI atualiza

READ (Buscar)
└─ page.tsx → await actions → DB query → Return data → Pass props → Render

UPDATE (Editar)
└─ Cliente form → Server Action → DB update → revalidatePath() → UI atualiza

DELETE (Remover)
└─ Cliente confirm → Server Action → DB delete → revalidatePath() → UI atualiza
```

---

## 🚨 8. TRATAMENTO DE ERROS

```
┌──────────────────────┐
│   Erro ocorre        │
│   (ex: DB timeout)   │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│   try...catch em     │
│   action.ts          │
└──────────┬───────────┘
           │
           ├─→ console.error() [Log]
           │
           ├─→ Return empty array [] [Safe default]
           │
           └─→ Client recebe []
               Mostra "Nenhum item"
               User não vê erro técnico
               
  💡 Hidden failures OK em dev
  💡 Lê console para debug
  💡 Add Sonner toast para erros críticos
```

---

## 📱 9. RESPONSIVIDADE

```
Desktop (>1024px)          Tablet (640-1024px)      Mobile (<640px)
┌──────────┐             ┌──────────┐             ┌────────┐
│ Sidebar  │             │ Sidebar  │             │ ☰ Menu │
│          │             │ colapsado│             │ (hidden)│
├──────────┤             ├──────────┤             ├────────┤
│          │             │          │             │        │
│ Content  │             │ Content  │             │Content │
│ 2-3 col  │             │ 1-2 col  │             │ Stack  │
│          │             │          │             │        │
└──────────┘             └──────────┘             └────────┘
```

---

**RESUMO**: Dados fluem do Cliente → Servidor → Banco → Volta → UI atualiza. Tudo type-safe com TypeScript! 🎉
