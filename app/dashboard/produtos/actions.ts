'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Produto, Material, ProdutoComMateriais } from '@/lib/types/database'

function parsePtBrNumber(raw: FormDataEntryValue | null): number {
  const s = String(raw ?? '').trim()
  if (!s) return 0
  // Remove milhares e converte decimal ',' -> '.'
  const normalized = s.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

export type ComposicaoInput = {
  material_id: string
  quantidade_usada: number
}

export type CustoProdutoCalculado = {
  custo_materiais: number
  maodeobra: number
  custo_total: number
  preco_sugerido: number
  lucro_estimado: number
  margem_real: number
  detalhes: Array<{
    material_id: string
    material_nome: string
    quantidade: number
    custo_unitario: number
    subtotal: number
  }>
}

export async function getProdutos() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('produtos')
    .select(`
      *,
      produto_materiais (
        id,
        quantidade_usada,
        material:materiais (*)
      )
    `)
    .order('nome')

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data as ProdutoComMateriais[]
}

export async function getProduto(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('produtos')
    .select(`
      *,
      produto_materiais (
        id,
        quantidade_usada,
        material:materiais (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return null
  }

  return data as ProdutoComMateriais
}

export async function getMateriais() {
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

export async function calcularCustoProduto(
  composicao: ComposicaoInput[],
  valorMaodeobra: number,
  margemLucro: number,
  precoVenda?: number
): Promise<CustoProdutoCalculado> {
  const supabase = await createClient()
  const detalhes: CustoProdutoCalculado['detalhes'] = []
  let custo_materiais = 0

  for (const item of composicao) {
    if (!item.material_id || item.quantidade_usada <= 0) continue

    const { data: material } = await supabase
      .from('materiais')
      .select('id, nome, custo_unitario')
      .eq('id', item.material_id)
      .single()

    if (!material) continue

    const custo_unitario = material.custo_unitario ?? 0
    const subtotal = custo_unitario * item.quantidade_usada
    custo_materiais += subtotal

    detalhes.push({
      material_id: material.id,
      material_nome: material.nome,
      quantidade: item.quantidade_usada,
      custo_unitario,
      subtotal,
    })
  }

  const maodeobra = valorMaodeobra || 0
  const custo_total = custo_materiais + maodeobra
  const preco_sugerido =
    margemLucro >= 100
      ? custo_total * 2
      : custo_total / (1 - margemLucro / 100)
  const preco = precoVenda ?? preco_sugerido
  const lucro_estimado = preco - custo_total
  const margem_real = preco > 0 ? (lucro_estimado / preco) * 100 : 0

  return {
    custo_materiais,
    maodeobra,
    custo_total,
    preco_sugerido,
    lucro_estimado,
    margem_real,
    detalhes,
  }
}

async function saveComposicao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  produtoId: string,
  composicao: ComposicaoInput[]
) {
  await supabase.from('produto_materiais').delete().eq('produto_id', produtoId)

  const validItems = composicao.filter(
    (item) => item.material_id && item.quantidade_usada > 0
  )

  if (validItems.length === 0) return

  const { error } = await supabase.from('produto_materiais').insert(
    validItems.map((item) => ({
      produto_id: produtoId,
      material_id: item.material_id,
      quantidade_usada: item.quantidade_usada,
    }))
  )

  if (error) {
    console.error('Error saving composition:', error)
    throw new Error(error.message)
  }
}

export async function createProduto(
  formData: FormData,
  composicao: ComposicaoInput[] = []
) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const tipo = formData.get('tipo') as string
  const preco_venda = parsePtBrNumber(formData.get('preco_venda'))
  const margem_lucro = parsePtBrNumber(formData.get('margem_lucro')) || 30
  const valor_maodeobra = parsePtBrNumber(formData.get('valor_maodeobra'))

  const { data: produto, error: produtoError } = await supabase
    .from('produtos')
    .insert({
      nome,
      tipo,
      preco_venda,
      margem_lucro,
      valor_maodeobra,
      ativo: true,
    })
    .select()
    .single()

  if (produtoError || !produto) {
    console.error('Error creating product:', produtoError)
    return { success: false, error: produtoError?.message || 'Erro ao criar produto' }
  }

  try {
    await saveComposicao(supabase, produto.id, composicao)
  } catch (err) {
    await supabase.from('produtos').delete().eq('id', produto.id)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao salvar composicao',
    }
  }

  revalidatePath('/dashboard/produtos')
  return { success: true }
}

export async function updateProduto(
  id: string,
  formData: FormData,
  composicao: ComposicaoInput[] = []
) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const tipo = formData.get('tipo') as string
  const preco_venda = parsePtBrNumber(formData.get('preco_venda'))
  const margem_lucro = parsePtBrNumber(formData.get('margem_lucro')) || 30
  const valor_maodeobra = parsePtBrNumber(formData.get('valor_maodeobra'))
  const ativo = formData.get('ativo') === 'true'

  const { error: produtoError } = await supabase
    .from('produtos')
    .update({
      nome,
      tipo,
      preco_venda,
      margem_lucro,
      valor_maodeobra,
      ativo,
    })
    .eq('id', id)

  if (produtoError) {
    console.error('Error updating product:', produtoError)
    return { success: false, error: produtoError.message }
  }

  try {
    await saveComposicao(supabase, id, composicao)
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao salvar composicao',
    }
  }

  revalidatePath('/dashboard/produtos')
  return { success: true }
}

export async function duplicateProduto(id: string) {
  const produto = await getProduto(id)
  if (!produto) {
    return { success: false, error: 'Produto nao encontrado' }
  }

  const supabase = await createClient()
  const { data: novo, error } = await supabase
    .from('produtos')
    .insert({
      nome: `${produto.nome} (copia)`,
      tipo: produto.tipo,
      preco_venda: produto.preco_venda,
      margem_lucro: produto.margem_lucro,
      valor_maodeobra: produto.valor_maodeobra ?? 0,
      ativo: true,
    })
    .select()
    .single()

  if (error || !novo) {
    return { success: false, error: error?.message || 'Erro ao duplicar' }
  }

  const composicao = produto.produto_materiais.map((pm) => ({
    material_id: pm.material_id,
    quantidade_usada: pm.quantidade_usada,
  }))

  try {
    await saveComposicao(supabase, novo.id, composicao)
  } catch (err) {
    await supabase.from('produtos').delete().eq('id', novo.id)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao copiar composicao',
    }
  }

  revalidatePath('/dashboard/produtos')
  return { success: true, produtoId: novo.id }
}

export async function deleteProduto(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('produtos').delete().eq('id', id)

  if (error) {
    console.error('Error deleting product:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/produtos')
  return { success: true }
}

export async function toggleProdutoAtivo(id: string, ativo: boolean) {
  const supabase = await createClient()

  const { error } = await supabase.from('produtos').update({ ativo }).eq('id', id)

  if (error) {
    console.error('Error toggling product:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/produtos')
  return { success: true }
}

export async function getComposicaoProduto(produtoId: string): Promise<ComposicaoInput[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('produto_materiais')
    .select('material_id, quantidade_usada')
    .eq('produto_id', produtoId)

  if (error || !data) return []

  return data.map((row) => ({
    material_id: row.material_id,
    quantidade_usada: row.quantidade_usada,
  }))
}
