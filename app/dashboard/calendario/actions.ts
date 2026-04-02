'use server'

import { createClient } from '@/lib/supabase/server'
import type { Pedido } from '@/lib/types/database'

export type PedidoCalendario = Pick<
  Pedido,
  'id' | 'cliente_nome' | 'cliente_telefone' | 'data_entrega' | 'status' | 'valor_total' | 'desconto'
>

export async function getPedidosComEntrega(): Promise<PedidoCalendario[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pedidos')
    .select('id, cliente_nome, cliente_telefone, data_entrega, status, valor_total, desconto')
    .not('data_entrega', 'is', null)
    .in('status', ['pendente', 'em_producao', 'pronto'])
    .order('data_entrega', { ascending: true })

  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }

  return data || []
}
