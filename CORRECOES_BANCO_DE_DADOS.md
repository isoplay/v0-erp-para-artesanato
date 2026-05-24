# Análise e Correções - Alinhamento BD vs Código

## 📊 Resumo das Inconsistências Encontradas e Corrigidas

### ✅ **TIPOS ATUALIZADOS** (`lib/types/database.ts`)

#### 1. **Material** - 7 campos ajustados
```diff
- descricao, quantidade_atual, quantidade_minima, custo_unitario, fornecedor
+ tipo, preco_compra, quantidade (sem "atual")
```

#### 2. **Produto** - Nome de campo crítico
```diff
- categoria (errado), descricao, custo_producao, tempo_producao_minutos
+ tipo (correto), margem_lucro
```

#### 3. **ProdutoMaterial** - Qtd Field
```diff
- quantidade
+ quantidade_usada
```

#### 4. **Pedido** - Múltiplas mudanças
```diff
- cliente_telefone, cliente_endereco, data_entrega, desconto, tipo_produto_id, variacao_id
+ cliente_contato, prazo_entrega, prioridade
```

#### 5. **StatusPedido** - Enum corrigido
```diff
- em_orcamento, aguardando_material
+ pendente (conforme BD CHECK constraint)
```

#### 6. **PedidoItem** - Nomes de campos
```diff
- preco_unitario → valor_unitario
- subtotal → valor_total
```

#### 7. **Despesa** - Campo de data
```diff
- data_despesa → data
- Removido: comprovante_url
```

#### 8. **TipoMovimentacao** - Enum
```diff
- entrada | saida | ajuste
+ entrada | saida (BD não suporta "ajuste")
```

---

### ✅ **ACTIONS.TS CORRIGIDAS**

#### `app/dashboard/actions.ts` (Dashboard)
- [x] `quantidade_atual` → `quantidade`
- [x] `quantidade_minima` → removido (não existe no BD)
- [x] `data_despesa` → `data`
- [x] Removido desconto do cálculo de receita

#### `app/dashboard/produtos/actions.ts`
- [x] `quantidade` → `quantidade_usada` (em produto_materiais)
- [x] `createProduto`: descricao, categoria, custo_producao, tempo_producao → tipo, margem_lucro
- [x] `updateProduto`: idem

#### `app/dashboard/estoque/actions.ts`
- [x] `quantidade_atual` → `quantidade`
- [x] Removido campos: quantidade_minima, custo_unitario, fornecedor, descricao
- [x] Adicionado: tipo, preco_compra
- [x] `registrarMovimentacao`: removido suporte a 'ajuste'

#### `app/dashboard/pedidos/actions.ts`
- [x] `cliente_telefone` → `cliente_contato`
- [x] `cliente_endereco` → removido
- [x] `data_entrega` → `prazo_entrega`
- [x] `desconto` → removido
- [x] `preco_unitario` → `valor_unitario`
- [x] `subtotal` → `valor_total`
- [x] Status: pendente, em_producao, finalizado, cancelado

---

### ✅ **COMPONENTES REACT CORRIGIDOS**

#### `produtos-content.tsx`
- [x] `p.categoria` → `p.tipo`
- [x] Removido filtro por `descricao`
- [x] Campo de formulário: categoria → tipo
- [x] Removido: descricao, tempo_producao_minutos
- [x] Adicionado: margem_lucro

#### `estoque-content.tsx`
- [x] Removido filtro por `fornecedor`
- [x] Ajustado `getStockStatus()`: quantidade_atual → quantidade
- [x] Formulário: removido descricao, quantidade_minima, custo_unitario, fornecedor
- [x] Adicionado: tipo, preco_compra

#### `pedidos-content.tsx`
- [x] StatusPedido: atualizado para 'pendente', 'em_producao', 'finalizado', 'cancelado'
- [x] `generateWhatsAppMessage()`: removido desconto, item.subtotal → item.valor_total
- [x] Removido: cliente_telefone, cliente_endereco, desconto, preco_unitario
- [x] Adicionado: cliente_contato, prazo_entrega, valor_unitario

---

## 🔴 **CAMPO AINDA NÃO CORRIGIDO** 

### `pedidos-content.tsx` - Type `ItemInput`
⚠️ Ainda contém `preco_unitario` ao invés de `valor_unitario`
- Necessário buscar/atualizar usages em todo o arquivo
- Afeta: handleCreate, handleUpdate, cálculos de items

---

## 📋 **Verificação Pós-Correção**

```bash
# 1. Build
pnpm build

# 2. Type check
pnpm lint

# 3. Check runtime
pnpm dev
```

Se houver erros:
1. Procure por `quantidade_atual` (BD = `quantidade`)
2. Procure por `categoria` em Produto (BD = `tipo`)
3. Procure por `preco_unitario` em PedidoItem (BD = `valor_unitario`)

---

## 📌 **Notas Importantes**

1. **Campos Removidos do Código:**
   - descricao (materiais)
   - quantidade_minima, quantidade_atual (sempre use "quantidade")
   - custo_unitario, preco_compra (são distintos!)
   - fornecedor, cliente_endereco, desconto
   - tempo_producao_minutos, custo_producao

2. **Campos Adicionados:**
   - `tipo` (materiais, produtos)
   - `prioridade` (pedidos)
   - `preco_compra` (materiais)
   - `margem_lucro` (produtos)

3. **Status de Pedido Corrigido:**
   - BD: `pendente | em_producao | finalizado | cancelado`
   - Código anterior tentava: `em_orcamento | aguardando_material` (✗ não existem)

