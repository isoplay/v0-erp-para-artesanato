'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

async function resolveProdutoIdForCategoria(
  supabase: SupabaseClient,
  categoriaId: string
): Promise<string | null> {
  const tipoMap: Record<string, string> = {
    terco: 'terco',
    terço: 'terco',
    pulseira: 'pulseira',
    chaveiro: 'chaveiro',
  }

  const { data: categoria } = await supabase
    .from('categorias_produtos')
    .select('nome')
    .eq('id', categoriaId)
    .maybeSingle()

  const nomeNorm = categoria?.nome
    ?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const tipo = (nomeNorm && tipoMap[nomeNorm]) || 'outro'

  const { data: porTipo } = await supabase
    .from('produtos')
    .select('id')
    .eq('tipo', tipo)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (porTipo?.id) return porTipo.id

  const { data: qualquer } = await supabase
    .from('produtos')
    .select('id')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  return qualquer?.id ?? null
}

import type {
  CategoriaProduto,
  VariacaoTipo,
  GrupoComponente,
  ComponenteDisponivel,
  ConfiguracaoMaodeobra,
  CategoriaCompleta,
} from '@/lib/types/database'

/**
 * Get all active product categories with their variations and component groups
 */
export async function getCategorias() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categorias_produtos')
    .select(
      `
      id,
      nome,
      descricao,
      ativo,
      ordem,
      created_at,
      updated_at,
      variacoes_tipo (
        id,
        nome,
        descricao,
        ativo,
        ordem,
        created_at,
        updated_at
      ),
      grupos_componentes (
        id,
        nome,
        descricao,
        obrigatorio,
        permite_multipla_selecao,
        ordem,
        ativo,
        created_at,
        updated_at
      )
    `
    )
    .eq('ativo', true)
    .order('ordem')

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  return data as (CategoriaProduto & {
    variacoes_tipo: VariacaoTipo[]
    grupos_componentes: GrupoComponente[]
  })[]
}

/**
 * Get all available components for a specific category
 * Returns grouped by component group
 */
export async function getComponentesPorCategoria(categoria_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vw_componentes_disponiveis')
    .select('*')
    .eq('categoria_id', categoria_id)
    .eq('ativo', true)
    .order('grupo_nome, material_nome')

  if (error) {
    console.error('Error fetching components:', error)
    return []
  }

  return data as ComponenteDisponivel[]
}

/**
 * Get available components for a specific component group
 */
export async function getComponentesPorGrupo(grupo_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('componentes_estoque')
    .select(
      `
      id,
      grupo_id,
      material_id,
      margem_lucro,
      ativo,
      ordem,
      created_at,
      updated_at,
      material:materiais (
        id,
        nome,
        preco_compra,
        custo_unitario,
        quantidade,
        imagem_url
      )
    `
    )
    .eq('grupo_id', grupo_id)
    .eq('ativo', true)
    .order('ordem, material->nome')

  if (error) {
    console.error('Error fetching group components:', error)
    return []
  }

  return data
}

/**
 * Validate if there's enough stock for selected components
 * Returns: { valid: boolean, messages: string[] }
 */
export async function validarEstoqueComponentes(
  componentes: Array<{
    material_id: string
    quantidade: number
  }>
): Promise<{ valid: boolean; messages: string[] }> {
  const supabase = await createClient()

  const messages: string[] = []
  let valid = true

  for (const componente of componentes) {
    const { data, error } = await supabase
      .from('materiais')
      .select('nome, quantidade, quantidade_atual')
      .eq('id', componente.material_id)
      .single()

    if (error || !data) {
      messages.push(`Material não encontrado`)
      valid = false
      continue
    }

    const estoque = data.quantidade_atual ?? data.quantidade ?? 0
    if (estoque < componente.quantidade) {
      messages.push(
        `${data.nome}: apenas ${estoque} em estoque (pedindo ${componente.quantidade})`
      )
      valid = false
    }
  }

  return { valid, messages }
}

/**
 * Calculate the final price for a composed item
 * Price = sum(component prices) + labor cost
 * Component price = cost_unitario * (1 + margin_lucro/100)
 */
export async function calcularPrecoItemMontado(
  categoria_id: string,
  componentes: Array<{
    material_id: string
    quantidade: number
  }>
): Promise<{
  total_componentes: number
  maodeobra: number
  total: number
  detalhes: Array<{
    material_nome: string
    valor_unitario: number
    quantidade: number
    subtotal: number
  }>
}> {
  const supabase = await createClient()

  // Get labor cost for category
  const { data: maodeobra_data, error: maodeobra_error } = await supabase
    .from('configuracao_maodeobra')
    .select('valor_maodeobra')
    .eq('categoria_id', categoria_id)
    .single()

  if (maodeobra_error) {
    console.error('Error fetching labor cost:', maodeobra_error)
  }

  const maodeobra = maodeobra_data?.valor_maodeobra || 0

  // Get component prices
  const detalhes: Array<{
    material_nome: string
    valor_unitario: number
    quantidade: number
    subtotal: number
  }> = []
  let total_componentes = 0

  for (const componente of componentes) {
    const { data, error } = await supabase
      .from('componentes_estoque')
      .select(
        `
        margem_lucro,
        material:materiais (
          nome,
          custo_unitario
        )
      `
      )
      .eq('material_id', componente.material_id)
      .limit(1)
      .single()

    if (error || !data) {
      console.error(`Error fetching component price for ${componente.material_id}:`, error)
      continue
    }

    const material = data.material as any
    const custo = material?.custo_unitario || 0
    const margem = data.margem_lucro || 30
    const valor_unitario = custo * (1 + margem / 100)
    const subtotal = valor_unitario * componente.quantidade

    detalhes.push({
      material_nome: material?.nome || 'Unknown',
      valor_unitario,
      quantidade: componente.quantidade,
      subtotal,
    })

    total_componentes += subtotal
  }

  return {
    total_componentes,
    maodeobra,
    total: total_componentes + maodeobra,
    detalhes,
  }
}

/**
 * Create a new order with custom item composition
 * This is the main function called when customer confirms their item builder selection
 */
export async function criarPedidoComMontagem(
  cliente_nome: string,
  cliente_telefone: string | null,
  cliente_endereco: string | null,
  data_entrega: string | null,
  tipo_produto_id: string,
  variacao_id: string | null,
  componentes: Array<{
    material_id: string
    quantidade: number
  }>,
  quantidade_itens: number,
  observacoes: string | null = null
) {
  const supabase = await createClient()

  try {
    // Calculate final price
    const precalizacao = await calcularPrecoItemMontado(tipo_produto_id, componentes)
    const valor_total = precalizacao.total * quantidade_itens

    // Validate stock
    const componentes_total = componentes.map(c => ({
      ...c,
      quantidade: c.quantidade * quantidade_itens,
    }))
    const validacao = await validarEstoqueComponentes(componentes_total)

    if (!validacao.valid) {
      console.error('Stock validation failed:', validacao.messages)
      return {
        success: false,
        error: `Estoque insuficiente: ${validacao.messages.join(', ')}`,
        deve_aguardar_material: true,
      }
    }

    const produtoId = await resolveProdutoIdForCategoria(supabase, tipo_produto_id)
    if (!produtoId) {
      return {
        success: false,
        error: 'Nenhum produto cadastrado. Cadastre um produto em Produtos antes de usar o montador.',
      }
    }

    const obsParts = [observacoes, variacao_id ? `Variacao: ${variacao_id}` : null].filter(Boolean)
    const observacoesFinal = obsParts.length > 0 ? obsParts.join(' | ') : null

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        cliente_nome,
        cliente_contato: cliente_telefone || null,
        prazo_entrega: data_entrega || null,
        status: 'em_orcamento',
        valor_total,
        observacoes: observacoesFinal,
        prioridade: 1,
      })
      .select()
      .single()

    if (pedidoError || !pedido) {
      console.error('Error creating order:', pedidoError)
      return { success: false, error: pedidoError?.message || 'Erro ao criar pedido' }
    }

    const { data: pedido_item, error: itemError } = await supabase
      .from('pedido_itens')
      .insert({
        pedido_id: pedido.id,
        produto_id: produtoId,
        quantidade: quantidade_itens,
        valor_unitario: precalizacao.total,
      })
      .select()
      .single()

    if (itemError || !pedido_item) {
      console.error('Error creating order item:', itemError)
      await supabase.from('pedidos').delete().eq('id', pedido.id)
      return { success: false, error: 'Erro ao adicionar item' }
    }

    // Insert custom component composition for this item
    const componentes_to_insert = componentes.map(c => ({
      pedido_item_id: pedido_item.id,
      material_id: c.material_id,
      quantidade: c.quantidade * quantidade_itens,
    }))

    const { error: materiaisError } = await supabase
      .from('pedido_itens_materiais')
      .insert(componentes_to_insert)

    if (materiaisError) {
      console.error('Error inserting component composition:', materiaisError)
      await supabase.from('pedido_itens').delete().eq('id', pedido_item.id)
      await supabase.from('pedidos').delete().eq('id', pedido.id)
      return { success: false, error: 'Erro ao salvar composição do item' }
    }

    revalidatePath('/dashboard/pedidos')
    revalidatePath('/dashboard')

    return {
      success: true,
      pedidoId: pedido.id,
      valor_total,
    }
  } catch (error) {
    console.error('Unexpected error creating order:', error)
    return { success: false, error: 'Erro inesperado ao criar pedido' }
  }
}

/**
 * Get labor cost configuration for a category
 */
export async function getConfiguracaoMaodeobra(categoria_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('configuracao_maodeobra')
    .select('*')
    .eq('categoria_id', categoria_id)
    .single()

  if (error) {
    console.error('Error fetching labor cost:', error)
    return { valor_maodeobra: 0, descricao: null }
  }

  return data as ConfiguracaoMaodeobra
}

/**
 * Get all labor cost configurations
 */
export async function getTodasConfiguracoesMaodeobra() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('configuracao_maodeobra')
    .select(
      `
      id,
      categoria_id,
      valor_maodeobra,
      descricao,
      categoria:categorias_produtos (
        id,
        nome
      )
    `
    )
    .order('categoria_id')

  if (error) {
    console.error('Error fetching labor costs:', error)
    return []
  }

  return data as unknown as (ConfiguracaoMaodeobra & {
    categoria: CategoriaProduto
  })[]
}

/**
 * Update labor cost for a category
 */
export async function atualizarMaodeobra(
  categoria_id: string,
  novo_valor: number
) {
  const supabase = await createClient()

  if (novo_valor < 0) {
    return { success: false, error: 'Valor deve ser positivo' }
  }

  const { error } = await supabase
    .from('configuracao_maodeobra')
    .update({ valor_maodeobra: novo_valor })
    .eq('categoria_id', categoria_id)

  if (error) {
    console.error('Error updating labor cost:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard')

  return { success: true }
}
