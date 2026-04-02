'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Pedido, PedidoComItens, Produto, StatusPedido, Material, ProdutoMaterial } from '@/lib/types/database'

export async function getPedidos() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      pedido_itens (
        id,
        quantidade,
        preco_unitario,
        subtotal,
        produto:produtos (*)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }

  return data as PedidoComItens[]
}

export async function getPedido(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      pedido_itens (
        id,
        quantidade,
        preco_unitario,
        subtotal,
        produto:produtos (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching order:', error)
    return null
  }

  return data as PedidoComItens
}

export async function getProdutosAtivos() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data as Produto[]
}

type ItemInput = {
  produto_id: string
  quantidade: number
  preco_unitario: number
}

export async function createPedido(
  formData: FormData,
  itens: ItemInput[]
) {
  const supabase = await createClient()

  const cliente_nome = formData.get('cliente_nome') as string
  const cliente_telefone = formData.get('cliente_telefone') as string
  const cliente_endereco = formData.get('cliente_endereco') as string
  const data_entrega = formData.get('data_entrega') as string
  const desconto = parseFloat(formData.get('desconto') as string) || 0
  const observacoes = formData.get('observacoes') as string

  // Calculate total
  const valor_total = itens.reduce((acc, item) => acc + item.preco_unitario * item.quantidade, 0)

  // Insert order
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      cliente_nome,
      cliente_telefone: cliente_telefone || null,
      cliente_endereco: cliente_endereco || null,
      data_pedido: new Date().toISOString(),
      data_entrega: data_entrega || null,
      status: 'pendente',
      valor_total,
      desconto,
      observacoes: observacoes || null,
    })
    .select()
    .single()

  if (pedidoError || !pedido) {
    console.error('Error creating order:', pedidoError)
    return { success: false, error: pedidoError?.message || 'Erro ao criar pedido' }
  }

  // Insert items
  if (itens.length > 0) {
    const itensToInsert = itens.map(item => ({
      pedido_id: pedido.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      subtotal: item.preco_unitario * item.quantidade,
    }))

    const { error: itensError } = await supabase
      .from('pedido_itens')
      .insert(itensToInsert)

    if (itensError) {
      console.error('Error adding items:', itensError)
      // Delete the order if items failed
      await supabase.from('pedidos').delete().eq('id', pedido.id)
      return { success: false, error: 'Erro ao adicionar itens' }
    }
  }

  revalidatePath('/dashboard/pedidos', 'max')
  revalidatePath('/dashboard', 'max')
  return { success: true, pedidoId: pedido.id }
}

export async function updatePedido(
  id: string,
  formData: FormData,
  itens: ItemInput[]
) {
  const supabase = await createClient()

  const cliente_nome = formData.get('cliente_nome') as string
  const cliente_telefone = formData.get('cliente_telefone') as string
  const cliente_endereco = formData.get('cliente_endereco') as string
  const data_entrega = formData.get('data_entrega') as string
  const desconto = parseFloat(formData.get('desconto') as string) || 0
  const observacoes = formData.get('observacoes') as string

  // Calculate total
  const valor_total = itens.reduce((acc, item) => acc + item.preco_unitario * item.quantidade, 0)

  // Update order
  const { error: pedidoError } = await supabase
    .from('pedidos')
    .update({
      cliente_nome,
      cliente_telefone: cliente_telefone || null,
      cliente_endereco: cliente_endereco || null,
      data_entrega: data_entrega || null,
      valor_total,
      desconto,
      observacoes: observacoes || null,
    })
    .eq('id', id)

  if (pedidoError) {
    console.error('Error updating order:', pedidoError)
    return { success: false, error: pedidoError.message }
  }

  // Delete existing items and re-insert
  await supabase.from('pedido_itens').delete().eq('pedido_id', id)

  if (itens.length > 0) {
    const itensToInsert = itens.map(item => ({
      pedido_id: id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      subtotal: item.preco_unitario * item.quantidade,
    }))

    const { error: itensError } = await supabase
      .from('pedido_itens')
      .insert(itensToInsert)

    if (itensError) {
      console.error('Error updating items:', itensError)
      return { success: false, error: 'Erro ao atualizar itens' }
    }
  }

  revalidatePath('/dashboard/pedidos', 'max')
  revalidatePath('/dashboard', 'max')
  return { success: true }
}

export async function updatePedidoStatus(id: string, status: StatusPedido) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pedidos')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('Error updating status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/pedidos', 'max')
  revalidatePath('/dashboard', 'max')
  return { success: true }
}

export async function deletePedido(id: string) {
  const supabase = await createClient()

  // First delete items
  await supabase.from('pedido_itens').delete().eq('pedido_id', id)

  // Then delete order
  const { error } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting order:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/pedidos', 'max')
  revalidatePath('/dashboard', 'max')
  return { success: true }
}

export type ClienteHistorico = {
  cliente_nome: string
  cliente_telefone: string | null
  cliente_endereco: string | null
  total_pedidos: number
  valor_total: number
  ultimo_pedido: string
}

export type MaterialNecessario = {
  material_id: string
  material_nome: string
  unidade: string
  quantidade_necessaria: number
  quantidade_disponivel: number
  suficiente: boolean
}

export type VerificacaoProducao = {
  produto_id: string
  produto_nome: string
  quantidade: number
  pode_produzir: boolean
  quantidade_maxima: number
  materiais: MaterialNecessario[]
  tempo_producao_total: number
}

export async function verificarMateriaisProducao(
  itens: { produto_id: string; quantidade: number }[]
): Promise<VerificacaoProducao[]> {
  const supabase = await createClient()
  
  // Get all product compositions with materials
  const { data: produtos, error: produtosError } = await supabase
    .from('produtos')
    .select(`
      id,
      nome,
      tempo_producao_minutos,
      produto_materiais (
        quantidade,
        material:materiais (
          id,
          nome,
          unidade,
          quantidade_atual
        )
      )
    `)
    .in('id', itens.map(i => i.produto_id))

  if (produtosError || !produtos) {
    console.error('Error fetching products:', produtosError)
    return []
  }

  const verificacoes: VerificacaoProducao[] = []
  
  // Create a map to track material usage across all items
  const materialUsado = new Map<string, number>()

  for (const item of itens) {
    const produto = produtos.find(p => p.id === item.produto_id)
    if (!produto) continue

    const materiaisNecessarios: MaterialNecessario[] = []
    let podeProduzir = true
    let quantidadeMaxima = Infinity

    for (const pm of produto.produto_materiais) {
      if (!pm.material) continue
      
      const material = pm.material as Material
      const quantidadeNecessaria = pm.quantidade * item.quantidade
      const jaUsado = materialUsado.get(material.id) || 0
      const disponivel = material.quantidade_atual - jaUsado
      const suficiente = disponivel >= quantidadeNecessaria

      if (!suficiente) {
        podeProduzir = false
      }

      // Calculate max units that can be produced
      const maxUnidades = pm.quantidade > 0 ? Math.floor(disponivel / pm.quantidade) : Infinity
      quantidadeMaxima = Math.min(quantidadeMaxima, maxUnidades)

      materiaisNecessarios.push({
        material_id: material.id,
        material_nome: material.nome,
        unidade: material.unidade,
        quantidade_necessaria: quantidadeNecessaria,
        quantidade_disponivel: disponivel,
        suficiente,
      })

      // Update used materials
      materialUsado.set(material.id, jaUsado + quantidadeNecessaria)
    }

    verificacoes.push({
      produto_id: item.produto_id,
      produto_nome: produto.nome,
      quantidade: item.quantidade,
      pode_produzir: podeProduzir,
      quantidade_maxima: quantidadeMaxima === Infinity ? 0 : quantidadeMaxima,
      materiais: materiaisNecessarios,
      tempo_producao_total: produto.tempo_producao_minutos * item.quantidade,
    })
  }

  return verificacoes
}

export async function searchClientes(query: string): Promise<ClienteHistorico[]> {
  if (!query || query.length < 2) return []
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('pedidos')
    .select('cliente_nome, cliente_telefone, cliente_endereco, valor_total, desconto, created_at')
    .ilike('cliente_nome', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) {
    console.error('Error searching clients:', error)
    return []
  }

  // Group by client name and aggregate
  const clienteMap = new Map<string, ClienteHistorico>()
  
  for (const pedido of data) {
    const existing = clienteMap.get(pedido.cliente_nome)
    const valorLiquido = pedido.valor_total - pedido.desconto
    
    if (existing) {
      existing.total_pedidos++
      existing.valor_total += valorLiquido
    } else {
      clienteMap.set(pedido.cliente_nome, {
        cliente_nome: pedido.cliente_nome,
        cliente_telefone: pedido.cliente_telefone,
        cliente_endereco: pedido.cliente_endereco,
        total_pedidos: 1,
        valor_total: valorLiquido,
        ultimo_pedido: pedido.created_at,
      })
    }
  }

  return Array.from(clienteMap.values()).slice(0, 5)
}
