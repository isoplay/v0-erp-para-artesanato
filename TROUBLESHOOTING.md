# 🔧 Troubleshooting - Resolução de Problemas

## 🚨 Problema: "Página em branco ao abrir"

### Causa Possível 1: `.env.local` faltando
```bash
# Verificar se existe:
ls -la .env.local   # Linux/Mac
dir .env.local      # Windows

# Solução: Criar arquivo com:
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

### Causa Possível 2: Banco de dados sem migrations
```sql
-- Executar em Supabase > SQL Editor:
-- Colar conteúdo de: scripts/001_create_tables.sql
-- Colar conteúdo de: scripts/002_add_image_and_order_materials.sql
-- Clicar "Executar"
```

### Causa Possível 3: Erro no console em tempo real
```bash
# No terminal onde rodou pnpm dev:
# Procurar por: [ error ] ou [ ERROR ]
# Ler a mensagem de erro completa
# Copiar erro + colar em pesquisa
```

---

## 🚨 Problema: "Cannot find module '@/components/ui/...'"

### Causa: Aliases TypeScript não funcionando
```bash
# Verificar tsconfig.json linha ~26:
"paths": {
  "@/*": ["./*"]
}

# Deve estar lá! Se não estiver, adicionar.
```

---

## 🚨 Problema: "Supabase connection timeout"

### Solução 1: Verificar credenciais
```bash
# .env.local deve ter:
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co    # Começa com https://
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx...               # Tem 100+ caracteres

# Pegar em: https://app.supabase.com 
# -> Projeto -> Settings > API > Project URL + anon key
```

### Solução 2: Verificar conexão de internet
```bash
# Testar ping para Supabase:
ping app.supabase.com   # Deve responder

# Se não funcionar: VPN bloqueando? Firewall?
```

### Solução 3: Limpar cache do Next.js
```bash
# Deletar pastas de cache:
rm -rf .next                    # Linux/Mac
rmdir /s /q .next              # Windows

# Recompilar:
pnpm dev
```

---

## 🚨 Problema: "Storage bucket 'imagens-estoque' not found"

### Solução: Criar bucket no Supabase
```
1. Ir para: https://app.supabase.com/project/[seu-projeto]/storage
2. Clicar em "+ New bucket"
3. Nome: imagens-estoque
4. Marcar: "Public bucket" ✓
5. Criar bucket
6. Pronto! Agora uploads func
