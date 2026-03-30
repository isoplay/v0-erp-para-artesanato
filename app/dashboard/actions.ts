'use server'

import { createClient } from '@/lib/supabase/server'
import type { Pedido, Material, Despesa } from '@/lib/types/database'

export async function getDashboardMetrics() {
  const supabase = await createClient()
  
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  // Get orders this month
  const { data: pedidosMes, error: pedidosError } = await supabase
    .from('pedidos')
    .select('*')
    .gte('data_pedido', firstDayOfMonth)
    .lte('data_pedido', lastDayOfMonth)

  if (pedidosError) {
    console.error('Error fetching pedidos:', pedidosError)
  }

  // Get pending orders
  const { data: pedidosPendentes, error: pendentesError } = await supabase
    .from('pedidos')
    .select('*')
    .in('status', ['pendente', 'em_producao'])

  if (pendentesError) {
    console.error('Error fetching pending orders:', pendentesError)
  }

  // Get low stock materials
  const { data: materiaisBaixoEstoque, error: materiaisError } = await supabase
    .from('materiais')
    .select('*')
    .filter('quantidade_atual', 'lt', 'quantidade_minima')

  // Alternative approach for low stock - get all and filter client side
  const { data: todosMateriais } = await supabase
    .from('materiais')
    .select('*')

  const materiaisLowStock = todosMateriais?.filter(
    (m: Material) => m.quantidade_atual <= m.quantidade_minima
  ) || []

  // Get expenses this month
  const { data: despesasMes, error: despesasError } = await supabase
    .from('despesas')
    .select('*')
    .gte('data_despesa', firstDayOfMonth)
    .lte('data_despesa', lastDayOfMonth)

  if (despesasError) {
    console.error('Error fetching despesas:', despesasError)
  }

  // Calculate totals
  const receitaMes = (pedidosMes || []).reduce((acc: number, p: Pedido) => {
    if (p.status !== 'cancelado') {
      return acc + (p.valor_total - p.desconto)
    }
    return acc
  }, 0)

  const despesasTotalMes = (despesasMes || []).reduce((acc: number, d: Despesa) => acc + d.valor, 0)

  // Get recent orders
  const { data: pedidosRecentes } = await supabase
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    totalPedidosMes: pedidosMes?.length || 0,
    receitaMes,
    pedidosPendentes: pedidosPendentes?.length || 0,
    materiaisBaixoEstoque: materiaisLowStock.length,
    despesasTotalMes,
    lucroMes: receitaMes - despesasTotalMes,
    pedidosRecentes: pedidosRecentes || [],
    materiaisLowStock: materiaisLowStock.slice(0, 5),
  }
}
