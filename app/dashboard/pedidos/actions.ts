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
        valor_unitario,
        valor_total,
        produto:produtos (*)
      )
    `)
    .order('data_pedido', { ascending: false })

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
        valor_unitario,
        valor_total,
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

export async function getMateriaisDisponiveis() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('materiais')
    .select('*')
    .order('nome')

  if (error) {
    console.error('Error fetching materials:', error)
    return []
  }

  return data as Material[]
}

export type ItemInput = {
  produto_id: string
  quantidade: number
  valor_unitario: number
  materiais?: PedidoItemMaterialInput[]
}

export async function createPedido(
  formData: FormData,
  itens: ItemInput[]
) {
  const supabase = await createClient()

  const cliente_nome = formData.get('cliente_nome') as string
  const cliente_contato = formData.get('cliente_contato') as string
  const prazo_entrega = formData.get('prazo_entrega') as string
  const prioridade = parseInt(formData.get('prioridade') as string) || 1
  const observacoes = formData.get('observacoes') as string

  // Calculate total
  const valor_total = itens.reduce((acc, item) => acc + item.valor_unitario * item.quantidade, 0)

  // Insert order
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      cliente_nome,
      cliente_contato: cliente_contato || null,
      prazo_entrega: prazo_entrega || null,
      data_pedido: new Date().toISOString(),
      status: 'orcamento',
      prioridade,
      valor_total,
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
      valor_unitario: item.valor_unitario,
    }))

    const { data: insertedItens, error: itensError } = await supabase
      .from('pedido_itens')
      .insert(itensToInsert)
      .select('id')

    if (itensError || !insertedItens) {
      console.error('Error adding items:', itensError)
      await supabase.from('pedidos').delete().eq('id', pedido.id)
      return { success: false, error: 'Erro ao adicionar itens' }
    }

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i]
      const materiais = await resolveItemMateriais(
        supabase,
        item.produto_id,
        item.quantidade,
        item.materiais
      )
      if (materiais.length && insertedItens[i]) {
        const matResult = await addMateriaisAoPedidoItem(insertedItens[i].id, materiais)
        if (!matResult.success) {
          console.error('Error adding item materials:', matResult.error)
        }
      }
    }
  }

  revalidatePath('/dashboard/pedidos')
  revalidatePath('/dashboard')
  return { success: true, pedidoId: pedido.id }
}

export async function updatePedido(
  id: string,
  formData: FormData,
  itens: ItemInput[]
) {
  const supabase = await createClient()

  const cliente_nome = formData.get('cliente_nome') as string
  const cliente_contato = formData.get('cliente_contato') as string
  const prazo_entrega = formData.get('prazo_entrega') as string
  const prioridade = parseInt(formData.get('prioridade') as string) || 1
  const observacoes = formData.get('observacoes') as string

  // Calculate total
  const valor_total = itens.reduce((acc, item) => acc + item.valor_unitario * item.quantidade, 0)

  // Update order
  const { error: pedidoError } = await supabase
    .from('pedidos')
    .update({
      cliente_nome,
      cliente_contato: cliente_contato || null,
      prazo_entrega: prazo_entrega || null,
      prioridade,
      valor_total,
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
      valor_unitario: item.valor_unitario,
    }))

    const { data: insertedItens, error: itensError } = await supabase
      .from('pedido_itens')
      .insert(itensToInsert)
      .select('id')

    if (itensError || !insertedItens) {
      console.error('Error updating items:', itensError)
      return { success: false, error: 'Erro ao atualizar itens' }
    }

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i]
      const materiais = await resolveItemMateriais(
        supabase,
        item.produto_id,
        item.quantidade,
        item.materiais
      )
      if (materiais.length && insertedItens[i]) {
        const matResult = await addMateriaisAoPedidoItem(insertedItens[i].id, materiais)
        if (!matResult.success) {
          console.error('Error updating item materials:', matResult.error)
        }
      }
    }
  }

  revalidatePath('/dashboard/pedidos')
  revalidatePath('/dashboard')
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

  revalidatePath('/dashboard/pedidos')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/estoque')
  return { success: true }
}

export type MaterialBaixaPreview = {
  material_id: string
  material_nome: string
  unidade: string
  quantidade: number
  estoque_atual: number
  suficiente: boolean
}

async function resolveItemMateriais(
  supabase: Awaited<ReturnType<typeof createClient>>,
  produtoId: string,
  quantidadeItem: number,
  customMateriais?: PedidoItemMaterialInput[]
): Promise<PedidoItemMaterialInput[]> {
  if (customMateriais?.length) {
    return customMateriais
  }

  const { data } = await supabase
    .from('produto_materiais')
    .select('material_id, quantidade_usada')
    .eq('produto_id', produtoId)

  return (data || []).map((pm) => ({
    material_id: pm.material_id,
    quantidade: pm.quantidade_usada * quantidadeItem,
  }))
}

export async function getMateriaisBaixaPedido(
  pedidoId: string
): Promise<MaterialBaixaPreview[]> {
  const supabase = await createClient()

  const { data: itens, error } = await supabase
    .from('pedido_itens')
    .select(`
      id,
      quantidade,
      produto_id,
      pedido_itens_materiais (
        material_id,
        quantidade,
        material:materiais (nome, unidade, quantidade, quantidade_atual)
      )
    `)
    .eq('pedido_id', pedidoId)

  if (error || !itens) {
    console.error('Error fetching order materials:', error)
    return []
  }

  const agregado = new Map<string, MaterialBaixaPreview>()

  for (const item of itens) {
    const customMats = item.pedido_itens_materiais as Array<{
      material_id: string
      quantidade: number
      material: { nome: string; unidade: string; quantidade: number; quantidade_atual?: number }
    }>

    if (customMats?.length) {
      for (const mat of customMats) {
        const atual = mat.material.quantidade_atual ?? mat.material.quantidade ?? 0
        const existing = agregado.get(mat.material_id)
        if (existing) {
          existing.quantidade += mat.quantidade
          existing.suficiente = atual >= existing.quantidade
        } else {
          agregado.set(mat.material_id, {
            material_id: mat.material_id,
            material_nome: mat.material.nome,
            unidade: mat.material.unidade,
            quantidade: mat.quantidade,
            estoque_atual: atual,
            suficiente: atual >= mat.quantidade,
          })
        }
      }
      continue
    }

    const { data: composicao } = await supabase
      .from('produto_materiais')
      .select(`
        material_id,
        quantidade_usada,
        material:materiais (nome, unidade, quantidade, quantidade_atual)
      `)
      .eq('produto_id', item.produto_id)

    for (const pm of composicao || []) {
      const material = pm.material as {
        nome: string
        unidade: string
        quantidade: number
        quantidade_atual?: number
      }
      const qtd = pm.quantidade_usada * item.quantidade
      const atual = material.quantidade_atual ?? material.quantidade ?? 0
      const existing = agregado.get(pm.material_id)
      if (existing) {
        existing.quantidade += qtd
        existing.suficiente = atual >= existing.quantidade
      } else {
        agregado.set(pm.material_id, {
          material_id: pm.material_id,
          material_nome: material.nome,
          unidade: material.unidade,
          quantidade: qtd,
          estoque_atual: atual,
          suficiente: atual >= qtd,
        })
      }
    }
  }

  return Array.from(agregado.values())
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

  revalidatePath('/dashboard/pedidos')
  revalidatePath('/dashboard')
  return { success: true }
}

export type ClienteHistorico = {
  cliente_nome: string
  cliente_contato: string | null
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
      produto_materiais (
        quantidade_usada,
        material:materiais (
          id,
          nome,
          unidade,
          quantidade,
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

  type MaterialResumo = Pick<Material, 'id' | 'nome' | 'unidade'> & {
    quantidade?: number
    quantidade_atual?: number
  }
  
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
      
      const material = pm.material as unknown as MaterialResumo
      const qtdUsada = pm.quantidade_usada ?? 0
      const quantidadeNecessaria = qtdUsada * item.quantidade
      const jaUsado = materialUsado.get(material.id) || 0
      const estoque = material.quantidade_atual ?? material.quantidade ?? 0
      const disponivel = estoque - jaUsado
      const suficiente = disponivel >= quantidadeNecessaria

      if (!suficiente) {
        podeProduzir = false
      }

      const maxUnidades = qtdUsada > 0 ? Math.floor(disponivel / qtdUsada) : Infinity
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
      tempo_producao_total: 0,
    })
  }

  return verificacoes
}

export async function searchClientes(query: string): Promise<ClienteHistorico[]> {
  if (!query || query.length < 2) return []
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('pedidos')
    .select('cliente_nome, cliente_contato, valor_total, data_pedido')
    .ilike('cliente_nome', `%${query}%`)
    .order('data_pedido', { ascending: false })
    .limit(50)

  if (error || !data) {
    console.error('Error searching clients:', error)
    return []
  }

  // Group by client name and aggregate
  const clienteMap = new Map<string, ClienteHistorico>()
  
  for (const pedido of data) {
    const existing = clienteMap.get(pedido.cliente_nome)
    if (existing) {
      existing.total_pedidos++
      existing.valor_total += pedido.valor_total
    } else {
      clienteMap.set(pedido.cliente_nome, {
        cliente_nome: pedido.cliente_nome,
        cliente_contato: pedido.cliente_contato,
        total_pedidos: 1,
        valor_total: pedido.valor_total,
        ultimo_pedido: pedido.data_pedido,
      })
    }
  }

  return Array.from(clienteMap.values()).slice(0, 5)
}

// Materiais do pedido
export type PedidoItemMaterialInput = {
  material_id: string
  quantidade: number
}

export async function addMateriaisAoPedidoItem(
  pedidoItemId: string,
  materiais: PedidoItemMaterialInput[]
) {
  const supabase = await createClient()

  // Remove existing materials first
  await supabase
    .from('pedido_itens_materiais')
    .delete()
    .eq('pedido_item_id', pedidoItemId)

  if (materiais.length === 0) {
    return { success: true }
  }

  // Insert new materials
  const materiaisToInsert = materiais.map(m => ({
    pedido_item_id: pedidoItemId,
    material_id: m.material_id,
    quantidade: m.quantidade,
  }))

  const { error } = await supabase
    .from('pedido_itens_materiais')
    .insert(materiaisToInsert)

  if (error) {
    console.error('Error adding materials to order item:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/pedidos')
  return { success: true }
}

export async function getPedidoItemMateriais(pedidoItemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pedido_itens_materiais')
    .select('*, material:materiais(*)')
    .eq('pedido_item_id', pedidoItemId)

  if (error) {
    console.error('Error fetching order item materials:', error)
    return []
  }

  return data
}
