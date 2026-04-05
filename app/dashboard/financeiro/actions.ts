'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Despesa, CategoriaDespesa, Pedido } from '@/lib/types/database'

export async function getDespesas(mes?: number, ano?: number) {
  const supabase = await createClient()
  
  let query = supabase.from('despesas').select('*').order('data_despesa', { ascending: false })

  if (mes !== undefined && ano !== undefined) {
    const startDate = new Date(ano, mes, 1).toISOString()
    const endDate = new Date(ano, mes + 1, 0).toISOString()
    query = query.gte('data_despesa', startDate).lte('data_despesa', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching expenses:', error)
    return []
  }

  return data as Despesa[]
}

export async function createDespesa(formData: FormData) {
  const supabase = await createClient()

  const descricao = formData.get('descricao') as string
  const valor = parseFloat(formData.get('valor') as string) || 0
  const categoria = formData.get('categoria') as CategoriaDespesa
  const data_despesa = formData.get('data_despesa') as string

  const { error } = await supabase.from('despesas').insert({
    descricao,
    valor,
    categoria,
    data_despesa,
  })

  if (error) {
    console.error('Error creating expense:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/financeiro', 'max')
  revalidatePath('/dashboard', 'max')
  return { success: true }
}

export async function updateDespesa(id: string, formData: FormData) {
  const supabase = await createClient()

  const descricao = formData.get('descricao') as string
  const valor = parseFloat(formData.get('valor') as string) || 0
  const categoria = formData.get('categoria') as CategoriaDespesa
  const data_despesa = formData.get('data_despesa') as string

  const { error } = await supabase
    .from('despesas')
    .update({
      descricao,
      valor,
      categoria,
      data_despesa,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating expense:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/financeiro', 'max')
  revalidatePath('/dashboard', 'max')
  return { success: true }
}

export async function deleteDespesa(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('despesas').delete().eq('id', id)

  if (error) {
    console.error('Error deleting expense:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/financeiro', 'max')
  revalidatePath('/dashboard', 'max')
  return { success: true }
}

export async function getFinanceiroResumo(mes: number, ano: number) {
  const supabase = await createClient()

  const startDate = new Date(ano, mes, 1).toISOString()
  const endDate = new Date(ano, mes + 1, 0).toISOString()

  // Get orders for the month
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('*')
    .gte('data_pedido', startDate)
    .lte('data_pedido', endDate)

  // Get expenses for the month
  const { data: despesas } = await supabase
    .from('despesas')
    .select('*')
    .gte('data_despesa', startDate)
    .lte('data_despesa', endDate)

  // Calculate revenue from non-cancelled orders
  const receita = (pedidos || []).reduce((acc: number, p: Pedido) => {
    if (p.status !== 'cancelado') {
      return acc + (p.valor_total - p.desconto)
    }
    return acc
  }, 0)

  // Calculate total expenses
  const totalDespesas = (despesas || []).reduce((acc: number, d: Despesa) => acc + d.valor, 0)

  // Group expenses by category
  const despesasPorCategoria: Record<string, number> = {}
  ;(despesas || []).forEach((d: Despesa) => {
    despesasPorCategoria[d.categoria] = (despesasPorCategoria[d.categoria] || 0) + d.valor
  })

  // Count orders by status
  const pedidosPorStatus: Record<string, number> = {}
  ;(pedidos || []).forEach((p: Pedido) => {
    pedidosPorStatus[p.status] = (pedidosPorStatus[p.status] || 0) + 1
  })

  return {
    receita,
    totalDespesas,
    lucro: receita - totalDespesas,
    totalPedidos: pedidos?.length || 0,
    pedidosPorStatus,
    despesasPorCategoria,
    pedidos: pedidos || [],
    despesas: despesas || [],
  }
}
