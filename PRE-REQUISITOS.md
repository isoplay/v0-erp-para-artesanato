# 📋 PRÉ-REQUISITOS ANTES DE RODAR

## ⚠️ LISTA DE VERIFICAÇÃO OBRIGATÓRIA

### 1. AMBIENTE LOCAL
```
[ ] Node.js 18 ou superior instalado
    → Verificar: node --version
    → Deve retornar: v18.x.x ou v20.x.x

[ ] pnpm 8+ ou npm 10+ instalado  
    → Verificar: pnpm --version (ou npm --version)
    → Deve retornar: 8.x.x ou superior

[ ] Git instalado (opcional, só se vai clonar)
    → Verificar: git --version
```

### 2. PROJETO LOCAL
```
[ ] Pasta do projeto clonada/extraída
    → Caminho: e:\User\SOUZA\Downloads\v0-erp-para-artesanato-main\...
    
[ ] Arquivo package.json existe
    → Verificar: dir package.json (Windows)
    
[ ] Arquivo next.config.mjs existe
    → Verifica se é Next.js válido
```

### 3. SUPABASE SETUP
```
[ ] Conta Supabase criada (supabase.com)
    → Grátis, sem cartão obrigatório
    
[ ] Projeto Supabase criado
    → Nome: Pode ser "ERP Artesanato"
    → Região: Próxima de você (velocidade)
    
[ ] Credenciais obtidas
    → Ir para: Settings > API
    → Copiar: Project URL
    → Copiar: Anon Key (public key)
```

### 4. ARQUIVO .env.local
```
[ ] Arquivo .env.local criado na raiz do projeto
    → Caminho: e:\User\SOUZA\...\v0-erp-para-artesanato-main\.env.local
    
[ ] Conteúdo preenchido:
    NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx...xxxxx
    
    → NÃO usar quotes: ❌ "https://..."
    → Usar direto: ✅ https://...
```

### 5. MIGRATIONS SQL
```
[ ] SQL Migration 1 executado
    → Arquivo: scripts/001_create_tables.sql
    → Onde: Supabase > SQL Editor
    → Resultado: 6 tabelas criadas
    
[ ] SQL Migration 2 executado
    → Arquivo: scripts/002_add_image_and_order_materials.sql
    → Onde: Supabase > SQL Editor
    → Resultado: 2 mudanças (coluna + tabela)
```

### 6. STORAGE BUCKET
```
[ ] Bucket "imagens-estoque" criado
    → Onde: Supabase > Storage
    → Nome exato: imagens-estoque
    → Acesso: PUBLIC ✓ (importante!)
    
[ ] Permissões ajustadas
    → RLS Policies: Se habilitado, 
      permitir upload público
```

### 7. DEPENDÊNCIAS
```
[ ] Todos os pacotes instalados
    → Comando: pnpm install
    → Resultado: node_modules/ criado (~500MB)
    → Tempo: ~2 minutos
    
[ ] Sem erros de instalação
    → Se tiver erro: 🚨 Ler mensagem
```

---

## 🚀 ROTEIRO DE EXECUÇÃO

### PASSO 1: Setup Supabase (10 minutos)

```bash
1. Abrir https://app.supabase.com
2. Clicar "New Project"
3. Preencher:
   - Organization: Seu user
   - Name: ERP Artesanato  
   - Password: Salvo em lugar seguro!
   - Region: Escolher mais próxima
4. AGUARDAR: Projeto criando (2-3 min)
5. Copiar credenciais (Settings > API):
   - Project URL
   - Anon Key
6. Criar bucket:
   - Storage > New Bucket
   - Name: imagens-estoque
   - Access: Public ✓
7. Executar migrations:
   - SQL Editor > New Query
   - Colar conteúdo scripts/001_create_tables.sql
   - Run ✓
   - Colar conteúdo scripts/002_add_image_and_order_materials.sql
   - Run ✓
8. Verificar tabelas:
   - Table Editor
   - Deve ver: materiais, produtos, etc
```

### PASSO 2: Setup Local (5 minutos)

```bash
# Terminal: CD para pasta do projeto
cd e:\User\SOUZA\...\v0-erp-para-artesanato-main

# Criar arquivo .env.local
# Windows (Notepad)
echo NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co > .env.local
@REM Não recomendado, usar Notepad em vez disso

# Melhor: Abrir VSCode, criar arquivo manualmente
# File > New Text File
# Colar:
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
# File > Save As > .env.local
```

### PASSO 3: Instalar Dependências (3 minutos)

```bash
# No terminal, na pasta do projeto:
pnpm install

# Ou se não tiver pnpm:
npm install
# (Mais lento, mas funciona)
```

### PASSO 4: Rodar Desenvolvimento (1 minuto)

```bash
# Terminal:
pnpm dev

# Ou:
npm run dev

# Deve imprimir:
# ✓ ready
# > Local: http://localhost:3000

# Abrir navegador: http://localhost:3000
```

### PASSO 5: Registrar e Testar (5 minutos)

```
1. Página de login deve aparecer
2. Clicar em "Criar Conta"
3. Email + Senha
4. Verificar email (Supabase mandou?)
5. Confirmar link no email
6. Fazer login
7. Deve redirecionar para /dashboard
8. Testar Estoque > Novo Material > Upload foto
```

---

## 🛑 BLOQUEADORES COMUNS

| Problema | Solução Rápida |
|----------|---|
| `Cannot find module` | `pnpm install` |
| `SUPABASE_URL undefined` | Verificar `.env.local` existe e tem valores |
| `Tabelas não aparecem` | Executar migrations no Supabase SQL Editor |
| `Storage 403 error` | Verificar bucket é PUBLIC (não private) |
| `Página branca` | F12 > Console > ver erro, copiar, pesquisar |
| `localhost:3000 recusou` | A porta 3000 já está em uso, usar `PORT=3001 pnpm dev` |
| Lentidão extrema | Verificar pasta `.next` → deletar e rebuild |

---

## 📱 TESTAR PWA NO CELULAR

### Android (Chrome)
```
1. PC e celular no mesmo WiFi
2. Terminal: instalar ngrok
   npm install -g ngrok
3. ngrok http 3000
4. Copiar URL (ex: https://abcd-12-34-56-78.ngrok.io)
5. Celular: Chrome > Digite URL
6. Menu (⋮) > "Instalar app"
7. Pronto!
```

### iOS (Safari)
```
1. Mesmo WiFi
2. Safari > Compartilhar > "Adicionar à Tela de Início"
3. Pronto! (Mas sem Service Worker completo em cache até iOS 18)
```

---

## ✅ DEPOIS DE TUDO FUNCIONAR

```
[ ] Ler SETUP.md (guia completo)
[ ] Ler CHECKLIST.md (verificação final)
[ ] Ler TESTES.md (validar funcionalidades)
[ ] Ler CHANGELIST.md (entender mudanças)
[ ] Consultar TROUBLESHOOTING.md se algo quebrar
```

---

## 🎯 STATUS DE PRONTIDÃO

| Aspecto | Status | Obs |
|---------|--------|-----|
| Código | ✅ Pronto | TypeScript compilável |
| Banco | ✅ Pronto | Migrations testadas |
| UI | ✅ Pronto | Componentes funcionais |
| PWA | ✅ Pronto | Manifest válido |
| Docs | ✅ Pronto | 4 guias criados |

**➡️ VOCÊ ESTÁ 100% PRONTO! 🚀**

---

## 💬 DÚVIDAS FREQUENTES

### P: Por que preciso de Node.js?
R: Next.js roda em Node.js. Obrigatório.

### P: Posso usar npm em vez de pnpm?
R: Sim, mas `pnpm install` é mais rápido.

### P: É seguro compartilhar SUPABASE_ANON_KEY?
R: Sim, é a chave pública. Dados protegidos por RLS policies no Supabase.

### P: O app funciona sem internet?
R: Parcialmente. Cache básico funciona, banco de dados não.

### P: Preciso de hospedagem?
R: Para produção sim (Vercel, Railway, etc). Desenvolvimento é local.

### P: Como faz backup do banco?
R: Supabase oferece backups automáticos (plano gratuito tem 7 dias).

---

**🎉 Sucesso! Tudo pronto para começar!**
