'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Material, TipoMovimentacao } from '@/lib/types/database'

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

export async function createMaterial(formData: FormData) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const descricao = formData.get('descricao') as string
  const unidade = formData.get('unidade') as string
  const quantidade_atual = parseFloat(formData.get('quantidade_atual') as string) || 0
  const quantidade_minima = parseFloat(formData.get('quantidade_minima') as string) || 0
  const custo_unitario = parseFloat(formData.get('custo_unitario') as string) || 0
  const fornecedor = formData.get('fornecedor') as string

  const { error } = await supabase.from('materiais').insert({
    nome,
    descricao: descricao || null,
    unidade,
    quantidade_atual,
    quantidade_minima,
    custo_unitario,
    fornecedor: fornecedor || null,
  })

  if (error) {
    console.error('Error creating material:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/estoque', 'max')
  return { success: true }
}

export async function updateMaterial(id: string, formData: FormData) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const descricao = formData.get('descricao') as string
  const unidade = formData.get('unidade') as string
  const quantidade_minima = parseFloat(formData.get('quantidade_minima') as string) || 0
  const custo_unitario = parseFloat(formData.get('custo_unitario') as string) || 0
  const fornecedor = formData.get('fornecedor') as string

  const { error } = await supabase
    .from('materiais')
    .update({
      nome,
      descricao: descricao || null,
      unidade,
      quantidade_minima,
      custo_unitario,
      fornecedor: fornecedor || null,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating material:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/estoque', 'max')
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

  revalidatePath('/dashboard/estoque', 'max')
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
    .select('quantidade_atual')
    .eq('id', materialId)
    .single()

  if (fetchError || !material) {
    return { success: false, error: 'Material nao encontrado' }
  }

  // Calculate new quantity
  let novaQuantidade = material.quantidade_atual
  if (tipo === 'entrada') {
    novaQuantidade += quantidade
  } else if (tipo === 'saida') {
    novaQuantidade -= quantidade
    if (novaQuantidade < 0) {
      return { success: false, error: 'Quantidade insuficiente em estoque' }
    }
  } else {
    // ajuste - set directly
    novaQuantidade = quantidade
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
    .update({ quantidade_atual: novaQuantidade })
    .eq('id', materialId)

  if (updateError) {
    console.error('Error updating quantity:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/dashboard/estoque', 'max')
  revalidatePath('/dashboard', 'max')
  return { success: true }
}

export async function getMovimentacoes(materialId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('movimentacoes_estoque')
    .select('*')
    .eq('material_id', materialId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching movements:', error)
    return []
  }

  return data
}
