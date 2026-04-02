'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  ShoppingCart,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  MessageCircle,
  Phone,
} from 'lucide-react'
import type { Produto, PedidoComItens, StatusPedido } from '@/lib/types/database'
import {
  createPedido,
  updatePedido,
  deletePedido,
  updatePedidoStatus,
} from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClienteAutocomplete } from '@/components/cliente-autocomplete'
import { ProductionChecker } from '@/components/production-checker'
import type { ClienteHistorico } from './actions'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const statusOptions: { value: StatusPedido; label: string; className: string }[] = [
  { value: 'pendente', label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'em_producao', label: 'Em Producao', className: 'bg-blue-100 text-blue-800' },
  { value: 'pronto', label: 'Pronto', className: 'bg-green-100 text-green-800' },
  { value: 'entregue', label: 'Entregue', className: 'bg-gray-100 text-gray-800' },
  { value: 'cancelado', label: 'Cancelado', className: 'bg-red-100 text-red-800' },
]

function getStatusInfo(status: StatusPedido) {
  return statusOptions.find((s) => s.value === status) || statusOptions[0]
}

function generateWhatsAppMessage(pedido: PedidoComItens): string {
  const valorFinal = pedido.valor_total - pedido.desconto
  const itensText = pedido.pedido_itens
    .map((item) => `- ${item.produto.nome} (x${item.quantidade}): ${formatCurrency(item.subtotal)}`)
    .join('\n')
  
  let message = `Ola ${pedido.cliente_nome}!\n\n`
  message += `Seu pedido foi registrado:\n\n`
  message += `${itensText}\n\n`
  
  if (pedido.desconto > 0) {
    message += `Subtotal: ${formatCurrency(pedido.valor_total)}\n`
    message += `Desconto: -${formatCurrency(pedido.desconto)}\n`
  }
  
  message += `*Total: ${formatCurrency(valorFinal)}*\n\n`
  
  if (pedido.data_entrega) {
    message += `Previsao de entrega: ${format(new Date(pedido.data_entrega), "dd 'de' MMMM", { locale: ptBR })}\n\n`
  }
  
  message += `Obrigado pela preferencia!`
  
  return message
}

function getWhatsAppUrl(telefone: string, message: string): string {
  // Remove non-numeric characters from phone number
  const cleanPhone = telefone.replace(/\D/g, '')
  
  // Add Brazil country code if not present
  const phoneWithCode = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
  
  // Encode the message for URL
  const encodedMessage = encodeURIComponent(message)
  
  return `https://wa.me/${phoneWithCode}?text=${encodedMessage}`
}

type ItemInput = {
  produto_id: string
  quantidade: number
  preco_unitario: number
}

export function PedidosContent({
  pedidos,
  produtos,
}: {
  pedidos: PedidoComItens[]
  produtos: Produto[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedPedido, setSelectedPedido] = useState<PedidoComItens | null>(null)
  const [selectedItens, setSelectedItens] = useState<ItemInput[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  // Cliente form states
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [clienteEndereco, setClienteEndereco] = useState('')

  function handleSelectCliente(cliente: ClienteHistorico) {
    setClienteNome(cliente.cliente_nome)
    setClienteTelefone(cliente.cliente_telefone || '')
    setClienteEndereco(cliente.cliente_endereco || '')
  }

  function resetClienteForm() {
    setClienteNome('')
    setClienteTelefone('')
    setClienteEndereco('')
    setSelectedItens([])
  }

  const filteredPedidos = pedidos.filter((p) => {
    const matchesSearch =
      p.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_telefone?.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  function addItem() {
    if (produtos.length === 0) {
      toast.error('Nenhum produto cadastrado')
      return
    }
    const firstProduct = produtos[0]
    setSelectedItens([
      ...selectedItens,
      { produto_id: firstProduct.id, quantidade: 1, preco_unitario: firstProduct.preco_venda },
    ])
  }

  function removeItem(index: number) {
    setSelectedItens(selectedItens.filter((_, i) => i !== index))
  }

  function updateItem(
    index: number,
    field: 'produto_id' | 'quantidade' | 'preco_unitario',
    value: string | number
  ) {
    const updated = [...selectedItens]
    if (field === 'produto_id') {
      const produto = produtos.find((p) => p.id === value)
      updated[index].produto_id = value as string
      if (produto) {
        updated[index].preco_unitario = produto.preco_venda
      }
    } else if (field === 'quantidade') {
      updated[index].quantidade = value as number
    } else {
      updated[index].preco_unitario = value as number
    }
    setSelectedItens(updated)
  }

  function calculateTotal() {
    return selectedItens.reduce((acc, item) => acc + item.preco_unitario * item.quantidade, 0)
  }

  async function handleCreate(formData: FormData) {
    if (selectedItens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido')
      return
    }
    startTransition(async () => {
      const result = await createPedido(formData, selectedItens)
      if (result.success) {
        toast.success('Pedido criado com sucesso!')
        setIsAddOpen(false)
        setSelectedItens([])
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao criar pedido')
      }
    })
  }

  async function handleUpdate(formData: FormData) {
    if (!selectedPedido) return
    if (selectedItens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido')
      return
    }
    startTransition(async () => {
      const result = await updatePedido(selectedPedido.id, formData, selectedItens)
      if (result.success) {
        toast.success('Pedido atualizado com sucesso!')
        setIsEditOpen(false)
        setSelectedPedido(null)
        setSelectedItens([])
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao atualizar pedido')
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return
    startTransition(async () => {
      const result = await deletePedido(id)
      if (result.success) {
        toast.success('Pedido excluido com sucesso!')
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao excluir pedido')
      }
    })
  }

  async function handleStatusChange(id: string, status: StatusPedido) {
    startTransition(async () => {
      const result = await updatePedidoStatus(id, status)
      if (result.success) {
        toast.success('Status atualizado!')
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao atualizar status')
      }
    })
  }

  function openEdit(pedido: PedidoComItens) {
    setSelectedPedido(pedido)
    setSelectedItens(
      pedido.pedido_itens.map((item) => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
      }))
    )
    setIsEditOpen(true)
  }

  function openView(pedido: PedidoComItens) {
    setSelectedPedido(pedido)
    setIsViewOpen(true)
  }

  function sendWhatsApp(pedido: PedidoComItens) {
    if (!pedido.cliente_telefone) {
      toast.error('Cliente sem telefone cadastrado')
      return
    }
    const message = generateWhatsAppMessage(pedido)
    const url = getWhatsAppUrl(pedido.cliente_telefone, message)
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie os pedidos dos seus clientes</p>
        </div>
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open)
            if (!open) resetClienteForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Pedido</DialogTitle>
              <DialogDescription>Cadastre um novo pedido de cliente. Comece digitando o nome para ver clientes anteriores.</DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente_nome">Nome do Cliente *</Label>
                  <ClienteAutocomplete
                    id="cliente_nome"
                    name="cliente_nome"
                    required
                    value={clienteNome}
                    onChange={setClienteNome}
                    onSelectCliente={handleSelectCliente}
                    placeholder="Digite o nome do cliente..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cliente_telefone">Telefone (WhatsApp)</Label>
                  <Input
                    id="cliente_telefone"
                    name="cliente_telefone"
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente_endereco">Endereco</Label>
                <Input 
                  id="cliente_endereco" 
                  name="cliente_endereco" 
                  value={clienteEndereco}
                  onChange={(e) => setClienteEndereco(e.target.value)}
                  placeholder="Endereco completo" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_entrega">Data de Entrega</Label>
                  <Input id="data_entrega" name="data_entrega" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desconto">Desconto (R$)</Label>
                  <Input
                    id="desconto"
                    name="desconto"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Itens do Pedido *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar Item
                  </Button>
                </div>
                {selectedItens.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum item adicionado ao pedido.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedItens.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={item.produto_id}
                          onValueChange={(v) => updateItem(index, 'produto_id', v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome} - {formatCurrency(p.preco_venda)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-20"
                          placeholder="Qtd"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.preco_unitario}
                          onChange={(e) =>
                            updateItem(index, 'preco_unitario', parseFloat(e.target.value) || 0)
                          }
                          className="w-28"
                          placeholder="Preco"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="text-right font-medium">
                      Total: {formatCurrency(calculateTotal())}
                    </div>
                  </div>
                )}
              </div>

              {/* Production Check */}
              <ProductionChecker itens={selectedItens} />

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observacoes</Label>
                <Textarea id="observacoes" name="observacoes" placeholder="Observacoes do pedido" />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Pedidos ({filteredPedidos.length})
          </CardTitle>
          <CardDescription>Lista de todos os pedidos</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhum pedido encontrado'
                  : 'Nenhum pedido cadastrado ainda'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button variant="link" onClick={() => setIsAddOpen(true)} className="mt-2">
                  Cadastrar primeiro pedido
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map((pedido) => {
                    const statusInfo = getStatusInfo(pedido.status)
                    const valorFinal = pedido.valor_total - pedido.desconto
                    return (
                      <TableRow key={pedido.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{pedido.cliente_nome}</span>
                            {pedido.cliente_telefone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {pedido.cliente_telefone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(pedido.data_pedido), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                            {pedido.data_entrega && (
                              <span className="text-xs text-muted-foreground">
                                Entrega: {format(new Date(pedido.data_entrega), 'dd/MM', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{pedido.pedido_itens.length} item(s)</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">{formatCurrency(valorFinal)}</span>
                            {pedido.desconto > 0 && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatCurrency(pedido.valor_total)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={pedido.status}
                            onValueChange={(v) => handleStatusChange(pedido.id, v as StatusPedido)}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <Badge variant="secondary" className={statusInfo.className}>
                                {statusInfo.label}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  <Badge variant="secondary" className={s.className}>
                                    {s.label}
                                  </Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openView(pedido)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              {pedido.cliente_telefone && (
                                <DropdownMenuItem onClick={() => sendWhatsApp(pedido)}>
                                  <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Enviar WhatsApp
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(pedido)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(pedido.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              {selectedPedido && (
                <Badge variant="secondary" className={getStatusInfo(selectedPedido.status).className}>
                  {getStatusInfo(selectedPedido.status).label}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedPedido.cliente_nome}</p>
                </div>
                {selectedPedido.cliente_telefone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedPedido.cliente_telefone}</p>
                  </div>
                )}
              </div>
              {selectedPedido.cliente_endereco && (
                <div>
                  <p className="text-sm text-muted-foreground">Endereco</p>
                  <p className="font-medium">{selectedPedido.cliente_endereco}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data do Pedido</p>
                  <p className="font-medium">
                    {format(new Date(selectedPedido.data_pedido), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                {selectedPedido.data_entrega && (
                  <div>
                    <p className="text-sm text-muted-foreground">Previsao de Entrega</p>
                    <p className="font-medium">
                      {format(new Date(selectedPedido.data_entrega), "dd 'de' MMMM", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Itens do Pedido</p>
                <div className="space-y-2">
                  {selectedPedido.pedido_itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm bg-muted/50 rounded-md p-2"
                    >
                      <div>
                        <span className="font-medium">{item.produto.nome}</span>
                        <span className="text-muted-foreground ml-2">x{item.quantidade}</span>
                      </div>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedPedido.valor_total)}</span>
                </div>
                {selectedPedido.desconto > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto</span>
                    <span>-{formatCurrency(selectedPedido.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(selectedPedido.valor_total - selectedPedido.desconto)}</span>
                </div>
              </div>

              {selectedPedido.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observacoes</p>
                  <p className="text-sm">{selectedPedido.observacoes}</p>
                </div>
              )}

              {selectedPedido.cliente_telefone && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => sendWhatsApp(selectedPedido)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Enviar detalhes via WhatsApp
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) {
            setSelectedPedido(null)
            setSelectedItens([])
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
            <DialogDescription>Atualize as informacoes do pedido</DialogDescription>
          </DialogHeader>
          {selectedPedido && (
            <form action={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cliente_nome">Nome do Cliente *</Label>
                  <Input
                    id="edit-cliente_nome"
                    name="cliente_nome"
                    required
                    defaultValue={selectedPedido.cliente_nome}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cliente_telefone">Telefone (WhatsApp)</Label>
                  <Input
                    id="edit-cliente_telefone"
                    name="cliente_telefone"
                    defaultValue={selectedPedido.cliente_telefone || ''}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cliente_endereco">Endereco</Label>
                <Input
                  id="edit-cliente_endereco"
                  name="cliente_endereco"
                  defaultValue={selectedPedido.cliente_endereco || ''}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-data_entrega">Data de Entrega</Label>
                  <Input
                    id="edit-data_entrega"
                    name="data_entrega"
                    type="date"
                    defaultValue={
                      selectedPedido.data_entrega
                        ? selectedPedido.data_entrega.split('T')[0]
                        : ''
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-desconto">Desconto (R$)</Label>
                  <Input
                    id="edit-desconto"
                    name="desconto"
                    type="number"
                    step="0.01"
                    defaultValue={selectedPedido.desconto}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Itens do Pedido *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar Item
                  </Button>
                </div>
                {selectedItens.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item no pedido.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedItens.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={item.produto_id}
                          onValueChange={(v) => updateItem(index, 'produto_id', v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome} - {formatCurrency(p.preco_venda)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.preco_unitario}
                          onChange={(e) =>
                            updateItem(index, 'preco_unitario', parseFloat(e.target.value) || 0)
                          }
                          className="w-28"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="text-right font-medium">
                      Total: {formatCurrency(calculateTotal())}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-observacoes">Observacoes</Label>
                <Textarea
                  id="edit-observacoes"
                  name="observacoes"
                  defaultValue={selectedPedido.observacoes || ''}
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
