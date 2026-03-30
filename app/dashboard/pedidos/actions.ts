'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Pedido, PedidoComItens, Produto, StatusPedido } from '@/lib/types/database'

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

export function generateWhatsAppMessage(pedido: PedidoComItens) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  let message = `Ola ${pedido.cliente_nome}! 🙏\n\n`
  message += `*Detalhes do seu pedido:*\n\n`

  pedido.pedido_itens.forEach((item, index) => {
    message += `${index + 1}. ${item.produto.nome}\n`
    message += `   Qtd: ${item.quantidade} x ${formatCurrency(item.preco_unitario)}\n`
    message += `   Subtotal: ${formatCurrency(item.subtotal)}\n\n`
  })

  message += `*Valor Total:* ${formatCurrency(pedido.valor_total)}\n`
  
  if (pedido.desconto > 0) {
    message += `*Desconto:* -${formatCurrency(pedido.desconto)}\n`
    message += `*Valor Final:* ${formatCurrency(pedido.valor_total - pedido.desconto)}\n`
  }

  if (pedido.data_entrega) {
    const dataEntrega = new Date(pedido.data_entrega).toLocaleDateString('pt-BR')
    message += `\n*Previsao de entrega:* ${dataEntrega}\n`
  }

  if (pedido.observacoes) {
    message += `\n*Observacoes:* ${pedido.observacoes}\n`
  }

  message += `\nObrigado pela preferencia! Deus abencoe! ✝️`

  return message
}

export function getWhatsAppUrl(phone: string, message: string) {
  // Clean phone number - remove non-digits
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Add Brazil country code if not present
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)
  
  return `https://wa.me/${fullPhone}?text=${encodedMessage}`
}
