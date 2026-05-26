'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import type { Produto, PedidoComItens, StatusPedido, Material } from '@/lib/types/database'
import { STATUS_PEDIDO_OPTIONS } from '@/lib/types/database'
import {
  createPedido,
  updatePedido,
  deletePedido,
  updatePedidoStatus,
  getMateriaisBaixaPedido,
  type MaterialBaixaPreview,
} from './actions'
import { getComposicaoProduto } from '../produtos/actions'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClienteAutocomplete } from '@/components/cliente-autocomplete'
import { ProductionChecker } from '@/components/production-checker'
import ItemBuilder from './item-builder'
import type { ClienteHistorico } from './actions'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const statusOptions = STATUS_PEDIDO_OPTIONS

function getStatusInfo(status: StatusPedido) {
  return statusOptions.find((s) => s.value === status) || statusOptions[0]
}

function generateWhatsAppMessage(pedido: PedidoComItens): string {
  const itensText = pedido.pedido_itens
    .map((item) => `- ${item.produto.nome} (x${item.quantidade}): ${formatCurrency(item.valor_total)}`)
    .join('\n')
  
  let message = `Ola ${pedido.cliente_nome}!\n\n`
  message += `Seu pedido foi registrado:\n\n`
  message += `${itensText}\n\n`
  message += `*Total: ${formatCurrency(pedido.valor_total)}*\n\n`
  
  if (pedido.prazo_entrega) {
    message += `Previsao de entrega: ${format(new Date(pedido.prazo_entrega), "dd 'de' MMMM", { locale: ptBR })}\n\n`
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
  valor_unitario: number
  materiais?: Array<{
    material_id: string
    quantidade: number
  }>
}

export function PedidosContent({
  pedidos,
  produtos,
  materiais,
}: {
  pedidos: PedidoComItens[]
  produtos: Produto[]
  materiais: Material[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedPedido, setSelectedPedido] = useState<PedidoComItens | null>(null)
  const [selectedItens, setSelectedItens] = useState<ItemInput[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('novo') === '1') {
      setIsAddOpen(true)
    }
  }, [searchParams])
  
  // Estados para seleção de materiais
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [selectedMateraisTemp, setSelectedMateraisTemp] = useState<Array<{ material_id: string; quantidade: number }>>([])
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    pedidoId: string
    status: StatusPedido
    clienteNome: string
  } | null>(null)
  const [materiaisBaixaPreview, setMateriaisBaixaPreview] = useState<MaterialBaixaPreview[]>([])
  
  // Cliente form states
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')

  function handleSelectCliente(cliente: ClienteHistorico) {
    setClienteNome(cliente.cliente_nome)
    setClienteTelefone(cliente.cliente_contato || '')
  }

  function resetClienteForm() {
    setClienteNome('')
    setClienteTelefone('')
    setSelectedItens([])
  }

  const filteredPedidos = pedidos.filter((p) => {
    const matchesSearch =
      p.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_contato?.includes(searchTerm)
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
      { produto_id: firstProduct.id, quantidade: 1, valor_unitario: firstProduct.preco_venda },
    ])
  }

  function removeItem(index: number) {
    setSelectedItens(selectedItens.filter((_, i) => i !== index))
  }

  function updateItem(
    index: number,
    field: 'produto_id' | 'quantidade' | 'valor_unitario',
    value: string | number
  ) {
    const updated = [...selectedItens]
    if (field === 'produto_id') {
      const produto = produtos.find((p) => p.id === value)
      updated[index].produto_id = value as string
      if (produto) {
        updated[index].valor_unitario = produto.preco_venda
      }
      setSelectedItens(updated)
      if (produto) {
        startTransition(async () => {
          const composicao = await getComposicaoProduto(produto.id)
          setSelectedItens((prev) => {
            const copy = [...prev]
            if (!copy[index]) return copy
            copy[index] = {
              ...copy[index],
              materiais: composicao.map((c) => ({
                material_id: c.material_id,
                quantidade: c.quantidade_usada * copy[index].quantidade,
              })),
            }
            return copy
          })
        })
      }
      return
    }

    if (field === 'quantidade') {
      const oldQtd = updated[index].quantidade
      const qtd = value as number
      updated[index].quantidade = qtd
      if (updated[index].materiais?.length && oldQtd > 0) {
        updated[index].materiais = updated[index].materiais!.map((m) => ({
          ...m,
          quantidade: (m.quantidade / oldQtd) * qtd,
        }))
      }
    } else {
      updated[index].valor_unitario = value as number
    }
    setSelectedItens(updated)
  }

  function calculateTotal() {
    return selectedItens.reduce((acc, item) => acc + item.valor_unitario * item.quantidade, 0)
  }

  function openMaterialsSelection(index: number) {
    setSelectedItemIndex(index)
    setSelectedMateraisTemp(selectedItens[index].materiais || [])
    setIsMaterialsOpen(true)
  }

  function addMaterialTemp() {
    setSelectedMateraisTemp([...selectedMateraisTemp, { material_id: '', quantidade: 1 }])
  }

  function removeMaterialTemp(index: number) {
    setSelectedMateraisTemp(selectedMateraisTemp.filter((_, i) => i !== index))
  }

  function updateMaterialTemp(index: number, field: 'material_id' | 'quantidade', value: string | number) {
    const updated = [...selectedMateraisTemp]
    if (field === 'material_id') {
      updated[index].material_id = value as string
    } else {
      updated[index].quantidade = value as number
    }
    setSelectedMateraisTemp(updated)
  }

  function saveMaterialsSelection() {
    if (selectedItemIndex === null) return
    const updated = [...selectedItens]
    updated[selectedItemIndex].materiais = selectedMateraisTemp
    setSelectedItens(updated)
    setIsMaterialsOpen(false)
    toast.success('Materiais atualizados!')
  }

  function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedItens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido')
      return
    }
    const formData = new FormData(e.currentTarget)
    formData.set('cliente_nome', clienteNome)
    formData.set('cliente_contato', clienteTelefone)
    startTransition(async () => {
      const result = await createPedido(formData, selectedItens)
      if (result.success) {
        toast.success('Pedido criado com sucesso!')
        setIsAddOpen(false)
        resetClienteForm()
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao criar pedido. Cadastre um produto em Produtos antes de criar pedidos.')
      }
    })
  }

  function handleUpdateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedPedido) return
    if (selectedItens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido')
      return
    }
    const formData = new FormData(e.currentTarget)
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

  async function handleStatusChange(
    id: string,
    status: StatusPedido,
    clienteNome: string,
    estoqueBaixado?: boolean
  ) {
    if ((status === 'pronto' || status === 'entregue') && !estoqueBaixado) {
      const preview = await getMateriaisBaixaPedido(id)
      if (preview.length === 0) {
        toast.error('Este pedido nao possui materiais para baixar. Verifique a composicao dos produtos.')
        return
      }
      setMateriaisBaixaPreview(preview)
      setPendingStatusChange({ pedidoId: id, status, clienteNome })
      setConfirmStatusOpen(true)
      return
    }

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

  function confirmStatusChange() {
    if (!pendingStatusChange) return
    const status = pendingStatusChange.status
    startTransition(async () => {
      const result = await updatePedidoStatus(
        pendingStatusChange.pedidoId,
        pendingStatusChange.status
      )
      if (result.success) {
        toast.success(
          status === 'pronto'
            ? 'Pedido pronto e estoque atualizado!'
            : 'Pedido entregue e estoque atualizado!'
        )
        setConfirmStatusOpen(false)
        setPendingStatusChange(null)
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
        valor_unitario: item.valor_unitario,
      }))
    )
    setIsEditOpen(true)
  }

  function openView(pedido: PedidoComItens) {
    setSelectedPedido(pedido)
    setIsViewOpen(true)
  }

  function sendWhatsApp(pedido: PedidoComItens) {
    if (!pedido.cliente_contato) {
      toast.error('Cliente sem telefone cadastrado')
      return
    }
    const message = generateWhatsAppMessage(pedido)
    const url = getWhatsAppUrl(pedido.cliente_contato, message)
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie os pedidos dos seus clientes</p>
        </div>
        <div className="flex gap-2">
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
            <form onSubmit={handleCreateSubmit} className="space-y-4">
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
                  <Label htmlFor="cliente_contato">Telefone (WhatsApp)</Label>
                  <Input
                    id="cliente_contato"
                    name="cliente_contato"
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazo_entrega">Prazo de Entrega</Label>
                <Input id="prazo_entrega" name="prazo_entrega" type="date" />
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
                          value={item.valor_unitario}
                          onChange={(e) =>
                            updateItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)
                          }
                          className="w-28"
                          placeholder="Preco"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openMaterialsSelection(index)}
                          title="Selecionar materiais a descontar"
                        >
                          📦
                        </Button>
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

        {/* Dialog para seleção de materiais */}
        <Dialog open={isMaterialsOpen} onOpenChange={setIsMaterialsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Selecionar Materiais a Descontar</DialogTitle>
              <DialogDescription>
                Escolha os materiais que serão descontados do estoque ao finalizar este item.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {materiais.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum material disponível no estoque.</p>
              ) : (
                <>
                  {selectedMateraisTemp.map((mat, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Select
                        value={mat.material_id}
                        onValueChange={(v) => updateMaterialTemp(index, 'material_id', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione o material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materiais.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome} ({m.unidade}) - Disponível: {m.quantidade_atual ?? m.quantidade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={mat.quantidade}
                        onChange={(e) => updateMaterialTemp(index, 'quantidade', parseFloat(e.target.value) || 1)}
                        className="w-24"
                        placeholder="Qtd"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMaterialTemp(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMaterialTemp}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Material
                  </Button>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMaterialsOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={saveMaterialsSelection}>
                Salvar Seleção
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button onClick={() => setIsBuilderOpen(true)} variant="outline" size="sm">
          Montagem Customizada
        </Button>
        </div>
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
                    return (
                      <TableRow key={pedido.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{pedido.cliente_nome}</span>
                            {pedido.cliente_contato && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {pedido.cliente_contato}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(pedido.data_pedido), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                            {pedido.prazo_entrega && (
                              <span className="text-xs text-muted-foreground">
                                Entrega: {format(new Date(pedido.prazo_entrega), 'dd/MM', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{pedido.pedido_itens.length} item(s)</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{formatCurrency(pedido.valor_total)}</span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={pedido.status}
                            onValueChange={(v) =>
                              handleStatusChange(
                                pedido.id,
                                v as StatusPedido,
                                pedido.cliente_nome,
                                pedido.estoque_baixado
                              )
                            }
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
                              {pedido.cliente_contato && (
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
                {selectedPedido.cliente_contato && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedPedido.cliente_contato}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data do Pedido</p>
                  <p className="font-medium">
                    {format(new Date(selectedPedido.data_pedido), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                {selectedPedido.prazo_entrega && (
                  <div>
                    <p className="text-sm text-muted-foreground">Previsao de Entrega</p>
                    <p className="font-medium">
                      {format(new Date(selectedPedido.prazo_entrega), "dd 'de' MMMM", {
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
                      <span>{formatCurrency(item.valor_total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(selectedPedido.valor_total)}</span>
                </div>
              </div>

              {selectedPedido.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observacoes</p>
                  <p className="text-sm">{selectedPedido.observacoes}</p>
                </div>
              )}

              {selectedPedido.cliente_contato && (
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
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
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
                  <Label htmlFor="edit-cliente_contato">Telefone (WhatsApp)</Label>
                  <Input
                    id="edit-cliente_contato"
                    name="cliente_contato"
                    defaultValue={selectedPedido.cliente_contato || ''}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-prazo_entrega">Prazo de Entrega</Label>
                <Input
                  id="edit-prazo_entrega"
                  name="prazo_entrega"
                  type="date"
                  defaultValue={
                    selectedPedido.prazo_entrega
                      ? selectedPedido.prazo_entrega.split('T')[0]
                      : ''
                  }
                />
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
                          value={item.valor_unitario}
                          onChange={(e) =>
                            updateItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)
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

      {/* Item Builder Modal */}
      <ItemBuilder
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSuccess={() => router.refresh()}
      />

      <AlertDialog open={confirmStatusOpen} onOpenChange={setConfirmStatusOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar baixa de estoque?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Ao marcar o pedido de{' '}
                  <strong>{pendingStatusChange?.clienteNome}</strong> como{' '}
                  <strong>
                    {pendingStatusChange
                      ? getStatusInfo(pendingStatusChange.status).label
                      : ''}
                  </strong>
                  , os materiais abaixo serao descontados do estoque:
                </p>
                <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                  {materiaisBaixaPreview.map((mat) => (
                    <div
                      key={mat.material_id}
                      className={`flex justify-between text-sm ${!mat.suficiente ? 'text-red-600' : ''}`}
                    >
                      <span>{mat.material_nome}</span>
                      <span>
                        -{mat.quantidade} {mat.unidade}
                        {!mat.suficiente && ' (insuficiente)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatusChange(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={materiaisBaixaPreview.some((m) => !m.suficiente) || isPending}
            >
              {pendingStatusChange?.status === 'pronto'
                ? 'Confirmar Pronto'
                : 'Confirmar Entrega'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
