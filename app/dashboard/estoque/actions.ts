'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Material, TipoMovimentacao } from '@/lib/types/database'

function parsePtBrNumber(raw: FormDataEntryValue | null): number {
  const s = String(raw ?? '').trim()
  if (!s) return 0
  // Remove milhares e converte decimal ',' -> '.'
  const normalized = s.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
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

export async function getMaterial(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('materiais')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching material:', error)
    return null
  }

  return data as Material
}

export async function uploadImagemMaterial(file: File): Promise<string | null> {
  const supabase = await createClient()

  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
  const filePath = `materiais/${fileName}`

  try {
    const { data, error } = await supabase.storage
      .from('imagens-estoque')
      .upload(filePath, file, { upsert: false })

    if (error) {
      console.error('Error uploading image:', error)
      return null
    }

    const { data: publicUrl } = supabase.storage
      .from('imagens-estoque')
      .getPublicUrl(filePath)

    return publicUrl.publicUrl
  } catch (error) {
    console.error('Error during image upload:', error)
    return null
  }
}

export async function createMaterial(formData: FormData) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const tipo = formData.get('tipo') as string
  const unidade = formData.get('unidade') as string
  const cor = formData.get('cor') as string
  const quantidade = parsePtBrNumber(formData.get('quantidade'))
  const quantidade_minima = parsePtBrNumber(formData.get('quantidade_minima')) || 30
  const custo_unitario_input = parsePtBrNumber(formData.get('custo_unitario'))
  // Fallback (compat): se ainda vier preco_compra do form antigo
  const preco_compra_input = parsePtBrNumber(formData.get('preco_compra'))
  const imagem = formData.get('imagem') as File | null

  let imagem_url = null
  if (imagem && imagem.size > 0) {
    imagem_url = await uploadImagemMaterial(imagem)
  }

  // Banco calcula `custo_unitario` como `preco_compra / quantidade`.
  // No formulário, o usuário digita o custo unitário em R$.
  const preco_compra =
    custo_unitario_input > 0 ? custo_unitario_input * quantidade : preco_compra_input

  const insertData: Record<string, unknown> = {
    nome,
    tipo,
    unidade,
    cor,
    quantidade,
    quantidade_atual: quantidade,
    quantidade_minima,
    preco_compra,
  }

  // Não enviar `imagem_url` quando não houver upload. Isso evita erros
  // quando o PostgREST ainda está com schema cache desatualizado.
  if (imagem_url) {
    insertData.imagem_url = imagem_url
  }

  const { error } = await supabase.from('materiais').insert(insertData)

  if (error) {
    console.error('Error creating material:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/estoque')
  return { success: true }
}

export async function updateMaterial(id: string, formData: FormData) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const tipo = formData.get('tipo') as string
  const unidade = formData.get('unidade') as string
  const cor = formData.get('cor') as string
  const quantidade = parsePtBrNumber(formData.get('quantidade'))
  const quantidade_minima = parsePtBrNumber(formData.get('quantidade_minima')) || 30
  const custo_unitario_input = parsePtBrNumber(formData.get('custo_unitario'))
  // Fallback (compat): se ainda vier preco_compra do form antigo
  const preco_compra_input = parsePtBrNumber(formData.get('preco_compra'))
  const imagem = formData.get('imagem') as File | null

  let imagem_url = undefined
  if (imagem && imagem.size > 0) {
    imagem_url = await uploadImagemMaterial(imagem)
  }

  const preco_compra =
    custo_unitario_input > 0 ? custo_unitario_input * quantidade : preco_compra_input

  const updateData: Record<string, unknown> = {
    nome,
    tipo,
    unidade,
    cor,
    quantidade,
    quantidade_atual: quantidade,
    quantidade_minima,
    preco_compra,
  }

  if (imagem_url) {
    updateData.imagem_url = imagem_url
  }

  const { error } = await supabase
    .from('materiais')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating material:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/estoque')
  return { success: true }
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiais')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting material:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/estoque')
  return { success: true }
}

export async function registrarMovimentacao(
  materialId: string,
  tipo: TipoMovimentacao,
  quantidade: number,
  motivo?: string
) {
  const supabase = await createClient()

  // Get current material
  const { data: material, error: fetchError } = await supabase
    .from('materiais')
    .select('quantidade, quantidade_atual')
    .eq('id', materialId)
    .single()

  if (fetchError || !material) {
    return { success: false, error: 'Material nao encontrado' }
  }

  const estoqueAtual =
    material.quantidade_atual ?? material.quantidade ?? 0
  let novaQuantidade = estoqueAtual
  if (tipo === 'entrada') {
    novaQuantidade += quantidade
  } else if (tipo === 'saida') {
    novaQuantidade -= quantidade
    if (novaQuantidade < 0) {
      return { success: false, error: 'Quantidade insuficiente em estoque' }
    }
  }

  // Insert movement record
  const { error: movError } = await supabase.from('movimentacoes_estoque').insert({
    material_id: materialId,
    tipo,
    quantidade,
    motivo: motivo || null,
  })

  if (movError) {
    console.error('Error registering movement:', movError)
    return { success: false, error: movError.message }
  }

  // Update material quantity
  const { error: updateError } = await supabase
    .from('materiais')
    .update({ quantidade: novaQuantidade, quantidade_atual: novaQuantidade })
    .eq('id', materialId)

  if (updateError) {
    console.error('Error updating quantity:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/dashboard/estoque')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getMovimentacoes(materialId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('movimentacoes_estoque')
    .select('*')
    .eq('material_id', materialId)
    .order('data_pedido', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching movements:', error)
    return []
  }

  return data
}
