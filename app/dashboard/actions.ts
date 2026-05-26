'use server'

import { createClient } from '@/lib/supabase/server'
import type { Pedido, Material, Despesa } from '@/lib/types/database'

function getEstoqueAtual(material: Material) {
  return material.quantidade_atual ?? material.quantidade ?? 0
}

export async function getDashboardMetrics() {
  const supabase = await createClient()

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const { data: pedidosMes, error: pedidosError } = await supabase
    .from('pedidos')
    .select('*')
    .gte('data_pedido', firstDayOfMonth)
    .lte('data_pedido', lastDayOfMonth)

  if (pedidosError) {
    console.error('Error fetching pedidos:', pedidosError)
  }

  const { data: pedidosPendentes, error: pendentesError } = await supabase
    .from('pedidos')
    .select('*')
    .in('status', ['orcamento', 'confirmado', 'em_producao', 'pronto'])

  if (pendentesError) {
    console.error('Error fetching pending orders:', pendentesError)
  }

  const { data: todosMateriais, error: materiaisError } = await supabase
    .from('materiais')
    .select('*')

  if (materiaisError) {
    console.error('Error fetching materials:', materiaisError)
  }

  const materiaisLowStock =
    todosMateriais?.filter((m: Material) => {
      const atual = getEstoqueAtual(m)
      const minimo = m.quantidade_minima ?? 30
      return atual <= minimo
    }) || []

  const { data: despesasMes, error: despesasError } = await supabase
    .from('despesas')
    .select('*')
    .gte('data', firstDayOfMonth)
    .lte('data', lastDayOfMonth)

  if (despesasError) {
    console.error('Error fetching despesas:', despesasError)
  }

  const receitaMes = (pedidosMes || []).reduce((acc: number, p: Pedido) => {
    if (p.status !== 'cancelado') {
      return acc + p.valor_total
    }
    return acc
  }, 0)

  const despesasTotalMes = (despesasMes || []).reduce(
    (acc: number, d: Despesa) => acc + d.valor,
    0
  )

  const { data: pedidosRecentes } = await supabase
    .from('pedidos')
    .select('*')
    .order('data_pedido', { ascending: false })
    .limit(5)

  const { data: proximosEntregas } = await supabase
    .from('pedidos')
    .select('*')
    .in('status', ['orcamento', 'confirmado', 'em_producao', 'pronto'])
    .not('prazo_entrega', 'is', null)
    .lte('prazo_entrega', inSevenDays)
    .gte('prazo_entrega', now.toISOString().split('T')[0])
    .order('prazo_entrega', { ascending: true })
    .limit(7)

  return {
    totalPedidosMes: pedidosMes?.length || 0,
    receitaMes,
    pedidosPendentes: pedidosPendentes?.length || 0,
    materiaisBaixoEstoque: materiaisLowStock.length,
    despesasTotalMes,
    lucroMes: receitaMes - despesasTotalMes,
    pedidosRecentes: pedidosRecentes || [],
    proximosEntregas: proximosEntregas || [],
    materiaisLowStock: materiaisLowStock.slice(0, 5),
  }
}
