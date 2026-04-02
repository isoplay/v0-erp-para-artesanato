'use server'

import { createClient } from '@/lib/supabase/server'
import type { Produto, Pedido, Material } from '@/lib/types/database'

export type SearchResult = {
  produtos: Pick<Produto, 'id' | 'nome' | 'categoria' | 'preco_venda'>[]
  pedidos: Pick<Pedido, 'id' | 'cliente_nome' | 'status' | 'valor_total' | 'desconto'>[]
  materiais: Pick<Material, 'id' | 'nome' | 'quantidade_atual' | 'unidade'>[]
}

export async function searchGlobal(query: string): Promise<SearchResult> {
  const supabase = await createClient()
  const searchTerm = `%${query}%`

  const [produtosResult, pedidosResult, materiaisResult] = await Promise.all([
    supabase
      .from('produtos')
      .select('id, nome, categoria, preco_venda')
      .or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm}`)
      .eq('ativo', true)
      .limit(5),
    
    supabase
      .from('pedidos')
      .select('id, cliente_nome, status, valor_total, desconto')
      .or(`cliente_nome.ilike.${searchTerm},cliente_telefone.ilike.${searchTerm}`)
      .limit(5),
    
    supabase
      .from('materiais')
      .select('id, nome, quantidade_atual, unidade')
      .or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm},fornecedor.ilike.${searchTerm}`)
      .limit(5),
  ])

  return {
    produtos: produtosResult.data || [],
    pedidos: pedidosResult.data || [],
    materiais: materiaisResult.data || [],
  }
}
