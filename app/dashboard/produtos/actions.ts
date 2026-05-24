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

type MaterialInput = {
  material_id: string
  quantidade: number
}

export async function createProduto(formData: FormData) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const tipo = formData.get('tipo') as string
  const preco_venda = parseFloat(formData.get('preco_venda') as string) || 0
  const margem_lucro = parseFloat(formData.get('margem_lucro') as string) || 30

  // Insert product
  const { data: produto, error: produtoError } = await supabase
    .from('produtos')
    .insert({
      nome,
      tipo,
      preco_venda,
      margem_lucro,
      ativo: true,
    })
    .select()
    .single()

  if (produtoError || !produto) {
    console.error('Error creating product:', produtoError)
    return { success: false, error: produtoError?.message || 'Erro ao criar produto' }
  }

  revalidatePath('/dashboard/produtos')
  return { success: true }
}

export async function updateProduto(id: string, formData: FormData) {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const tipo = formData.get('tipo') as string
  const preco_venda = parseFloat(formData.get('preco_venda') as string) || 0
  const margem_lucro = parseFloat(formData.get('margem_lucro') as string) || 30
  const ativo = formData.get('ativo') === 'true'

  // Update product
  const { error: produtoError } = await supabase
    .from('produtos')
    .update({
      nome,
      tipo,
      preco_venda,
      margem_lucro,
      ativo,
    })
    .eq('id', id)

  if (produtoError) {
    console.error('Error updating product:', produtoError)
    return { success: false, error: produtoError.message }
  }

  revalidatePath('/dashboard/produtos')
  return { success: true }
}

export async function deleteProduto(id: string) {
  const supabase = await createClient()

  // Then delete product (CASCADE will handle produto_materiais)
  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting product:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/produtos')
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

  revalidatePath('/dashboard/produtos')
  return { success: true }
}
