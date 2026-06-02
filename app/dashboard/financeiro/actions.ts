'use server'

import { revalidatePath } from 'next/cache'
import { parseDecimalInput } from '@/lib/number'
import { createAuthenticatedClient } from '@/lib/auth'
import type { Despesa, CategoriaDespesa, Pedido } from '@/lib/types/database'

export async function getDespesas(mes?: number, ano?: number) {
  const supabase = await createAuthenticatedClient()

  let query = supabase.from('despesas').select('*').order('data', { ascending: false })

  if (mes !== undefined && ano !== undefined) {
    // Construir strings de data diretamente (YYYY-MM-DD) para evitar problemas de fuso horário / parsing por ambiente (servidor vs cliente)
    const startDate = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
    // Último dia do mês: usar data do próximo mês -1 dia de forma segura via Date, mas forçar o dia local
    const lastDay = new Date(ano, mes + 1, 0).getDate()
    const endDate = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
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
  const supabase = await createAuthenticatedClient()

  const descricao = formData.get('descricao') as string
  const valor = parseDecimalInput(formData.get('valor'))
  const categoria = formData.get('categoria') as CategoriaDespesa
  const data = formData.get('data') as string

  if (!descricao.trim() || descricao.length > 160 || valor < 0 || valor > 1_000_000) {
    return { success: false, error: 'Dados da despesa invalidos' }
  }

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
  const supabase = await createAuthenticatedClient()

  const descricao = formData.get('descricao') as string
  const valor = parseDecimalInput(formData.get('valor'))
  const categoria = formData.get('categoria') as CategoriaDespesa
  const data = formData.get('data') as string

  if (!descricao.trim() || descricao.length > 160 || valor < 0 || valor > 1_000_000) {
    return { success: false, error: 'Dados da despesa invalidos' }
  }

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
  const supabase = await createAuthenticatedClient()

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
  const supabase = await createAuthenticatedClient()

  const startDate = new Date(ano, mes, 1).toISOString()
  const endDate = new Date(ano, mes + 1, 0).toISOString()
  const startDateOnly = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
  const lastDay = new Date(ano, mes + 1, 0).getDate()
  const endDateOnly = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

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
