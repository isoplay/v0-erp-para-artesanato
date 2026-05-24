'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Despesa, CategoriaDespesa, Pedido } from '@/lib/types/database'

export async function getDespesas(mes?: number, ano?: number) {
  const supabase = await createClient()

  let query = supabase.from('despesas').select('*').order('data', { ascending: false })

  if (mes !== undefined && ano !== undefined) {
    const startDate = new Date(ano, mes, 1).toISOString().split('T')[0]
    const endDate = new Date(ano, mes + 1, 0).toISOString().split('T')[0]
    query = query.gte('data', startDate).lte('data', endDate)
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
  const data = formData.get('data') as string

  const { error } = await supabase.from('despesas').insert({
    descricao,
    valor,
    categoria,
    data,
  })

  if (error) {
    console.error('Error creating expense:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateDespesa(id: string, formData: FormData) {
  const supabase = await createClient()

  const descricao = formData.get('descricao') as string
  const valor = parseFloat(formData.get('valor') as string) || 0
  const categoria = formData.get('categoria') as CategoriaDespesa
  const data = formData.get('data') as string

  const { error } = await supabase
    .from('despesas')
    .update({
      descricao,
      valor,
      categoria,
      data,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating expense:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteDespesa(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('despesas').delete().eq('id', id)

  if (error) {
    console.error('Error deleting expense:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getFinanceiroResumo(mes: number, ano: number) {
  const supabase = await createClient()

  const startDate = new Date(ano, mes, 1).toISOString()
  const endDate = new Date(ano, mes + 1, 0).toISOString()
  const startDateOnly = new Date(ano, mes, 1).toISOString().split('T')[0]
  const endDateOnly = new Date(ano, mes + 1, 0).toISOString().split('T')[0]

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('*')
    .gte('data_pedido', startDate)
    .lte('data_pedido', endDate)

  const { data: despesas } = await supabase
    .from('despesas')
    .select('*')
    .gte('data', startDateOnly)
    .lte('data', endDateOnly)

  const receita = (pedidos || []).reduce((acc: number, p: Pedido) => {
    if (p.status !== 'cancelado') {
      return acc + p.valor_total
    }
    return acc
  }, 0)

  const totalDespesas = (despesas || []).reduce((acc: number, d: Despesa) => acc + d.valor, 0)

  const despesasPorCategoria: Record<string, number> = {}
  ;(despesas || []).forEach((d: Despesa) => {
    despesasPorCategoria[d.categoria] = (despesasPorCategoria[d.categoria] || 0) + d.valor
  })

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
