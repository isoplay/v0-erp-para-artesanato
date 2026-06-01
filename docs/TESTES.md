# 🧪 Testes e Validação

## ✅ Testes Locais (Antes de Rodar em Produção)

### 1. **Testes de Autenticação**
```
1. Ir para http://localhost:3000
2. Página de login deve aparecer
3. Clicar em "Criar conta"
4. Registrar com: email + senha
5. Deve ser redirecionado para /dashboard
✓ Sucesso: Login e redirect funcionam
```

### 2. **Testes de Estoque**
```
1. Ir para http://localhost:3000/dashboard/estoque
2. Clicar em "+ Novo Material"
3. Preencher:
   - Nome: "Conta de Cristal Azul"
   - Unidade: "Unidade"
   - Qtd Inicial: 100
   - Qtd Mínima: 10
   - Custo Unit: 2.50
   - Fornecedor: "Fornecedor ABC"
   - Foto: Selecionar imagem local
4. Clicar em "Salvar"
5. Material deve aparecer na tabela
6. Clicar no menu (⋮) → "Editar"
7. Mudar "Qtd Atual" para 50
8. Salvar
9. Quantidade deve estar atualizada
✓ Sucesso: CRUD completo com foto
```

### 3. **Testes de Produtos**
```
1. Ir para http://localhost:3000/dashboard/produtos
2. Clicar em "+ Novo Produto"
3. Preencher:
   - Nome: "Terço de Cristal"
   - Categoria: "Terço"
   - Preço de Venda: 49.90
   - Tempo de Produção: 30
4. Clicar em "Salvar"
5. Produto deve aparecer na tabela
6. Clicar no menu (⋮) → "Ver detalhes"
7. Informações devem ser mostradas
8. Fechar e editar novamente
9. Mudar preço para 59.90
10. Salvar - deve atualizar
✓ Sucesso: Produto criado/editado sem materiais fixos
```

### 4. **Testes de Pedidos**
```
1. Ir para http://localhost:3000/dashboard/pedidos
2. Clicar em "+ Novo Pedido"
3. Preencher:
   - Cliente: "João Silva"
   - Telefone: (11) 98765-4321
   - Endereço: "Rua ABC, 123"
   - Data de Entrega: Hoje + 7 dias
4. Adicionar item:
   - Produto: "Terço de Cristal"
   - Quantidade: 2
   - Preço Unit: 49.90
5. Clicar em "Salvar"
6. Pedido deve aparecer com status "Pendente"
7. Clicar no pedido para expandir
8. Status deve poder ser alterado
✓ Sucesso: Pedido criado com itens
```

### 5. **Testes de Movimentação de Estoque**
```
1. Ir para http://localhost:3000/dashboard/estoque
2. Clicar no menu (⋮) de um material → "Entrada"
3. Preencher:
   - Tipo: Entrada
   - Quantidade: 50
   - Motivo: "Compra de fornecedor"
4. Registrar
5. Quantidade deve aumentar
6. Repetir com "Saída"
7. Quantidade deve diminuir
✓ Sucesso: Movimentações registadas corretamente
```

### 6. **Testes de Financeiro**
```
1. Ir para http://localhost:3000/dashboard/financeiro
2. Clicar em "+ Nova Despesa"
3. Preencher:
   - Descricao: "Compra de caixa"
   - Valor: 150.00
   - Categoria: "Material"
   - Data: Hoje
4. Salvar
5. Despesa deve aparecer na tabela
✓ Sucesso: Despesas registradas
```

### 7. **Testes de PWA (Celular)**
```
1. Conectar celular mesmo WiFi
2. Usar ngrok: ngrok http 3000
3. Copiar URL HTTPS gerada
4. Abrir URL no celular
5. Chrome: Menu (⋮) → Instalar app
6. iOS: Compartilhar → Adicionar à tela inicial
7. App deve abrir em modo standalone
8. Desconectar WiFi
9. App deve carregar cache básico
✓ Sucesso: App instalável E funciona offline (parcial)
```

### 8. **Testes de Responsividade**
```
1. Abrir em desktop: http://localhost:3000/dashboard
2. Deve ver layout completo
3. Abrir DevTools: F12
4. Mudar para mobile (iPhone 12)
5. Layout deve se adaptar (stack vertical)
6. Testar em tablet
7. Testar em 4K
✓ Sucesso: Responsivo em todas resoluções
```

### 9. **Testes de Tema (Dark/Light)**
```
1. Procurar toggle de tema (geralmente top-right)
2. Clicar para mudar tema
3. Cores devem mudar para dark ou light
4. Recarregar página: tema deve manter
✓ Sucesso: Tema persiste entre recargas
```

### 10. **Testes de Performance**
```
1. Abrir DevTools: F12
2. Ir para aba "Performance"
3. Registrar carregamento de /dashboard
4. Deve estar abaixo de 3 segundos
5. Ir para aba "Network"
6. Recarregar: deve ter <10 requisições
7. Total bundle < 500KB
✓ Sucesso: Performance aceitável
```

---

## 🐛 Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| `Cannot find module` | Dependências não instaladas | `pnpm install` |
| `SUPABASE_URL not found` | `.env.local` faltando | Criar `.env.local` com credenciais |
| `403 Storage access denied` | Bucket não é public | Marcar bucket como Public no Supabase |
| `Service Worker failed` | Esperado em dev | Ignorar, funciona em produção HTTPS |
| Imagem não salva | Bucket `imagens-estoque` não existe | Criar bucket no Supabase |
| Página em branco | Erro no servidor | Verificar console: `pnpm dev` |
| Materiais não aparecem | Migration não executada | Executar SQL em Supabase |

---

## 📊 Resultados Esperados

| Seção | Esperado | Status |
|-------|----------|--------|
| Login | Autenticação com Supabase | ✅ Pronto |
| Estoque | CRUD + Upload foto | ✅ Pronto |
| Produtos | CRUD simplificado | ✅ Pronto |
| Pedidos | CRUD com itemização | ✅ Pronto |
| Financeiro | Reportar despesas | ✅ Pronto |
| Dashboard | Métricas do mês | ✅ Pronto |
| PWA | Instalar como app | ✅ Pronto |
| Offline | Cache básico | ✅ Pronto |
| Mobile | Responsivo | ✅ Pronto |
| Temas | Dark/Light | ✅ Pronto |

---

## 🚦 Checklist de Deploy

Antes de colocar em produção:

- [ ] Todos os testes acima passaram ✓
- [ ] `.env.local` com credenciais Supabase reais
- [ ] Storage bucket exists e é public
- [ ] Migrations executadas no Supabase
- [ ] HTTPS habilitado (obrigatório para PWA)
- [ ] Build sem erros: `pnpm build`
- [ ] Testar produção: `pnpm build && pnpm start`

---

## 📝 Logs Esperados

Quando rodar `pnpm dev`, deve ver:

```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
✓  SW registered: /
  PageNotFound: catchall route used, pages/404.js will not be executed
```

---

## ✨ Status Geral

**Código:** ✅ Pronto
**Banco:** ✅ Pronto  
**UI:** ✅ Pronto
**PWA:** ✅ Pronto
**Docs:** ✅ Pronto

**=> TUDO OK PARA RODAR! 🚀**
