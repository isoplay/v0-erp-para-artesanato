'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Produto, Material, ProdutoComMateriais } from '@/lib/types/database'

export async function getProdutos() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('produtos')
    .select(`
      *,
      produto_materiais (
        id,
        quantidade,
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
        quantidade,
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

type MaterialInput = {
  material_id: string
  quantidade: number
}

export async function createProduto(
  formData: FormData,
  materiais: MaterialInput[]
) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const descricao = formData.get('descricao') as string
  const categoria = formData.get('categoria') as string
  const preco_venda = parseFloat(formData.get('preco_venda') as string) || 0
  const tempo_producao_minutos = parseInt(formData.get('tempo_producao_minutos') as string) || 0

  // Calculate production cost based on materials
  let custo_producao = 0
  if (materiais.length > 0) {
    const { data: materiaisData } = await supabase
      .from('materiais')
      .select('id, custo_unitario')
      .in('id', materiais.map(m => m.material_id))

    if (materiaisData) {
      for (const mat of materiais) {
        const materialInfo = materiaisData.find(m => m.id === mat.material_id)
        if (materialInfo) {
          custo_producao += materialInfo.custo_unitario * mat.quantidade
        }
      }
    }
  }

  // Insert product
  const { data: produto, error: produtoError } = await supabase
    .from('produtos')
    .insert({
      nome,
      descricao: descricao || null,
      categoria,
      preco_venda,
      custo_producao,
      tempo_producao_minutos,
      ativo: true,
    })
    .select()
    .single()

  if (produtoError || !produto) {
    console.error('Error creating product:', produtoError)
    return { success: false, error: produtoError?.message || 'Erro ao criar produto' }
  }

  // Insert materials composition
  if (materiais.length > 0) {
    const materiaisToInsert = materiais.map(m => ({
      produto_id: produto.id,
      material_id: m.material_id,
      quantidade: m.quantidade,
    }))

    const { error: matError } = await supabase
      .from('produto_materiais')
      .insert(materiaisToInsert)

    if (matError) {
      console.error('Error adding materials:', matError)
      // Delete the product if materials failed
      await supabase.from('produtos').delete().eq('id', produto.id)
      return { success: false, error: 'Erro ao adicionar materiais' }
    }
  }

  revalidatePath('/dashboard/produtos', 'max')
  return { success: true }
}

export async function updateProduto(
  id: string,
  formData: FormData,
  materiais: MaterialInput[]
) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const descricao = formData.get('descricao') as string
  const categoria = formData.get('categoria') as string
  const preco_venda = parseFloat(formData.get('preco_venda') as string) || 0
  const tempo_producao_minutos = parseInt(formData.get('tempo_producao_minutos') as string) || 0
  const ativo = formData.get('ativo') === 'true'

  // Calculate production cost based on materials
  let custo_producao = 0
  if (materiais.length > 0) {
    const { data: materiaisData } = await supabase
      .from('materiais')
      .select('id, custo_unitario')
      .in('id', materiais.map(m => m.material_id))

    if (materiaisData) {
      for (const mat of materiais) {
        const materialInfo = materiaisData.find(m => m.id === mat.material_id)
        if (materialInfo) {
          custo_producao += materialInfo.custo_unitario * mat.quantidade
        }
      }
    }
  }

  // Update product
  const { error: produtoError } = await supabase
    .from('produtos')
    .update({
      nome,
      descricao: descricao || null,
      categoria,
      preco_venda,
      custo_producao,
      tempo_producao_minutos,
      ativo,
    })
    .eq('id', id)

  if (produtoError) {
    console.error('Error updating product:', produtoError)
    return { success: false, error: produtoError.message }
  }

  // Delete existing materials and re-insert
  await supabase.from('produto_materiais').delete().eq('produto_id', id)

  if (materiais.length > 0) {
    const materiaisToInsert = materiais.map(m => ({
      produto_id: id,
      material_id: m.material_id,
      quantidade: m.quantidade,
    }))

    const { error: matError } = await supabase
      .from('produto_materiais')
      .insert(materiaisToInsert)

    if (matError) {
      console.error('Error updating materials:', matError)
      return { success: false, error: 'Erro ao atualizar materiais' }
    }
  }

  revalidatePath('/dashboard/produtos', 'max')
  return { success: true }
}

export async function deleteProduto(id: string) {
  const supabase = await createClient()

  // First delete materials composition
  await supabase.from('produto_materiais').delete().eq('produto_id', id)

  // Then delete product
  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting product:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/produtos', 'max')
  return { success: true }
}

export async function toggleProdutoAtivo(id: string, ativo: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('produtos')
    .update({ ativo })
    .eq('id', id)

  if (error) {
    console.error('Error toggling product:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/produtos', 'max')
  return { success: true }
}
