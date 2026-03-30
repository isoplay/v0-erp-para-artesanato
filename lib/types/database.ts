export type Material = {
  id: string
  nome: string
  descricao: string | null
  unidade: string
  quantidade_atual: number
  quantidade_minima: number
  custo_unitario: number
  fornecedor: string | null
  created_at: string
  updated_at: string
}

export type Produto = {
  id: string
  nome: string
  descricao: string | null
  categoria: 'terco' | 'pulseira' | 'chaveiro' | 'outro'
  preco_venda: number
  custo_producao: number
  tempo_producao_minutos: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export type ProdutoMaterial = {
  id: string
  produto_id: string
  material_id: string
  quantidade: number
  // Joins
  material?: Material
  produto?: Produto
}

export type ProdutoComMateriais = Produto & {
  produto_materiais: (ProdutoMaterial & { material: Material })[]
}

export type StatusPedido = 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado'

export type Pedido = {
  id: string
  cliente_nome: string
  cliente_telefone: string | null
  cliente_endereco: string | null
  data_pedido: string
  data_entrega: string | null
  status: StatusPedido
  valor_total: number
  desconto: number
  observacoes: string | null
  created_at: string
  updated_at: string
}

export type PedidoItem = {
  id: string
  pedido_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  // Joins
  produto?: Produto
}

export type PedidoComItens = Pedido & {
  pedido_itens: (PedidoItem & { produto: Produto })[]
}

export type CategoriaDespesa = 'material' | 'ferramenta' | 'embalagem' | 'frete' | 'marketing' | 'outro'

export type Despesa = {
  id: string
  descricao: string
  valor: number
  categoria: CategoriaDespesa
  data_despesa: string
  comprovante_url: string | null
  created_at: string
}

export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste'

export type MovimentacaoEstoque = {
  id: string
  material_id: string
  tipo: TipoMovimentacao
  quantidade: number
  motivo: string | null
  pedido_id: string | null
  created_at: string
  // Joins
  material?: Material
}

// Dashboard metrics view
export type DashboardMetrics = {
  total_pedidos_mes: number
  receita_mes: number
  pedidos_pendentes: number
  materiais_baixo_estoque: number
}
