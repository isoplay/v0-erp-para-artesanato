'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Package, Search, Pencil, Trash2, Eye, Copy } from 'lucide-react'
import type { Material, ProdutoComMateriais } from '@/lib/types/database'
import { createProduto, updateProduto, deleteProduto, toggleProdutoAtivo, duplicateProduto } from './actions'
import type { ComposicaoInput } from './actions'
import { ComposicaoProdutoForm } from './composicao-produto-form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function parsePtBrNumber(value: string) {
  const s = String(value ?? '').trim()
  if (!s) return 0
  const normalized = s.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

const categorias = [
  { value: 'terco', label: 'Terco' },
  { value: 'pulseira', label: 'Pulseira' },
  { value: 'chaveiro', label: 'Chaveiro' },
  { value: 'outro', label: 'Outro' },
]

function getCategoriaLabel(value: string) {
  return categorias.find((c) => c.value === value)?.label || value
}

export function ProdutosContent({
  produtos,
  materiais,
}: {
  produtos: ProdutoComMateriais[]
  materiais: Material[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComMateriais | null>(null)
  const [addTipo, setAddTipo] = useState('terco')
  const [editTipo, setEditTipo] = useState('terco')
  const [addComposicao, setAddComposicao] = useState<ComposicaoInput[]>([])
  const [editComposicao, setEditComposicao] = useState<ComposicaoInput[]>([])
  const [addMaodeobra, setAddMaodeobra] = useState('5')
  const [editMaodeobra, setEditMaodeobra] = useState('5')
  const [addMargem, setAddMargem] = useState('60')
  const [editMargem, setEditMargem] = useState('60')
  const [addPreco, setAddPreco] = useState('0')
  const [editPreco, setEditPreco] = useState('0')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const filteredProdutos = produtos.filter((p) => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategoria = categoriaFilter === 'all' || p.tipo === categoriaFilter
    return matchesSearch && matchesCategoria
  })

  function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('tipo', addTipo)
    startTransition(async () => {
      const result = await createProduto(formData, addComposicao)
      if (result.success) {
        toast.success('Produto cadastrado com sucesso!')
        setIsAddOpen(false)
        setAddComposicao([])
        setAddMaodeobra('5')
        setAddMargem('60')
        setAddPreco('0')
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao cadastrar produto')
      }
    })
  }

  function handleUpdateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedProduto) return
    const formData = new FormData(e.currentTarget)
    formData.set('tipo', editTipo)
    startTransition(async () => {
      const result = await updateProduto(selectedProduto.id, formData, editComposicao)
      if (result.success) {
        toast.success('Produto atualizado com sucesso!')
        setIsEditOpen(false)
        setSelectedProduto(null)
        setEditComposicao([])
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao atualizar produto')
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return
    startTransition(async () => {
      const result = await deleteProduto(id)
      if (result.success) {
        toast.success('Produto excluido com sucesso!')
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao excluir produto')
      }
    })
  }

  async function handleToggleAtivo(id: string, ativo: boolean) {
    startTransition(async () => {
      const result = await toggleProdutoAtivo(id, ativo)
      if (result.success) {
        toast.success(ativo ? 'Produto ativado!' : 'Produto desativado!')
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao alterar status')
      }
    })
  }

  function openEdit(produto: ProdutoComMateriais) {
    setSelectedProduto(produto)
    setEditTipo(produto.tipo)
    setEditMaodeobra(String(produto.valor_maodeobra ?? 0))
    setEditMargem(String(produto.margem_lucro ?? 60))
    setEditPreco(String(produto.preco_venda))
    setEditComposicao(
      produto.produto_materiais.map((pm) => ({
        material_id: pm.material_id,
        quantidade_usada: pm.quantidade_usada,
      }))
    )
    setIsEditOpen(true)
  }

  function openView(produto: ProdutoComMateriais) {
    setSelectedProduto(produto)
    setIsViewOpen(true)
  }

  async function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateProduto(id)
      if (result.success) {
        toast.success('Produto duplicado!')
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao duplicar produto')
      }
    })
  }

  function calculateMargin(preco: number, custo: number) {
    if (custo === 0) return 100
    return ((preco - custo) / preco) * 100
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Produtos</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie seus produtos artesanais
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Produto</DialogTitle>
              <DialogDescription>
                Defina a receita padrao com materiais, custo e margem de lucro.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" name="nome" required placeholder="Ex: Terco de Cristal" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select value={addTipo} onValueChange={setAddTipo} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="tipo" value={addTipo} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco_venda">Preco de Venda *</Label>
                  <Input
                    id="preco_venda"
                    name="preco_venda"
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="R$ 0,00"
                    value={addPreco}
                    onChange={(e) => setAddPreco(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margem_lucro">Margem Desejada (%)</Label>
                  <Input
                    id="margem_lucro"
                    name="margem_lucro"
                    type="text"
                    inputMode="decimal"
                    value={addMargem}
                    onChange={(e) => setAddMargem(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_maodeobra">Mao de Obra (R$)</Label>
                <Input
                  id="valor_maodeobra"
                  name="valor_maodeobra"
                  type="text"
                  inputMode="decimal"
                  min="0"
                  value={addMaodeobra}
                  onChange={(e) => setAddMaodeobra(e.target.value)}
                />
              </div>

              <ComposicaoProdutoForm
                materiais={materiais}
                composicao={addComposicao}
                onChange={setAddComposicao}
                valorMaodeobra={parsePtBrNumber(addMaodeobra)}
                margemLucro={parsePtBrNumber(addMargem)}
                precoVenda={parsePtBrNumber(addPreco)}
              />

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
                placeholder="Buscar por nome ou descricao..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos ({filteredProdutos.length})
          </CardTitle>
          <CardDescription>Lista de todos os produtos cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProdutos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || categoriaFilter !== 'all'
                  ? 'Nenhum produto encontrado'
                  : 'Nenhum produto cadastrado ainda'}
              </p>
              {!searchTerm && categoriaFilter === 'all' && (
                <Button
                  variant="link"
                  onClick={() => setIsAddOpen(true)}
                  className="mt-2"
                >
                  Cadastrar primeiro produto
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preco</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutos.map((produto) => {
                    const margin = produto.margem_lucro ?? 0
                    return (
                      <TableRow key={produto.id} className={!produto.ativo ? 'opacity-50' : ''}>
                        <TableCell>
                          <span className="font-medium">{produto.nome}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getCategoriaLabel(produto.tipo)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(produto.preco_venda)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="secondary"
                            className={
                              margin >= 50
                                ? 'bg-green-100 text-green-800'
                                : margin >= 30
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {margin.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={produto.ativo}
                            onCheckedChange={(checked) => handleToggleAtivo(produto.id, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openView(produto)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(produto)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(produto.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(produto.id)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduto?.nome}</DialogTitle>
            <DialogDescription>
              {getCategoriaLabel(selectedProduto?.tipo || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedProduto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Preco de Venda</p>
                  <p className="font-medium">{formatCurrency(selectedProduto.preco_venda)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Margem de Lucro</p>
                  <p className="font-medium">{selectedProduto.margem_lucro}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedProduto.ativo ? 'default' : 'secondary'}>
                    {selectedProduto.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
              {selectedProduto.produto_materiais.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Composicao de Materiais</p>
                  <div className="space-y-2">
                    {selectedProduto.produto_materiais.map((pm) => (
                      <div
                        key={pm.id}
                        className="flex items-center justify-between text-sm bg-muted/50 rounded-md p-2"
                      >
                        <span>{pm.material.nome}</span>
                        <span className="text-muted-foreground">
                          {pm.quantidade_usada} {pm.material.unidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open)
        if (!open) {
          setSelectedProduto(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Atualize as informacoes do produto
            </DialogDescription>
          </DialogHeader>
          {selectedProduto && (
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome *</Label>
                  <Input
                    id="edit-nome"
                    name="nome"
                    required
                    defaultValue={selectedProduto.nome}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tipo">Tipo *</Label>
                  <Select value={editTipo} onValueChange={setEditTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="tipo" value={editTipo} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-preco_venda">Preco de Venda *</Label>
                  <Input
                    id="edit-preco_venda"
                    name="preco_venda"
                    type="text"
                    inputMode="decimal"
                    required
                    value={editPreco}
                    onChange={(e) => setEditPreco(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-margem_lucro">Margem Desejada (%)</Label>
                  <Input
                    id="edit-margem_lucro"
                    name="margem_lucro"
                    type="text"
                    inputMode="decimal"
                    value={editMargem}
                    onChange={(e) => setEditMargem(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-valor_maodeobra">Mao de Obra (R$)</Label>
                <Input
                  id="edit-valor_maodeobra"
                  name="valor_maodeobra"
                  type="text"
                  inputMode="decimal"
                  min="0"
                  value={editMaodeobra}
                  onChange={(e) => setEditMaodeobra(e.target.value)}
                />
              </div>

              <ComposicaoProdutoForm
                materiais={materiais}
                composicao={editComposicao}
                onChange={setEditComposicao}
                valorMaodeobra={parsePtBrNumber(editMaodeobra)}
                margemLucro={parsePtBrNumber(editMargem)}
                precoVenda={parsePtBrNumber(editPreco)}
              />
              <input type="hidden" name="ativo" value={selectedProduto.ativo.toString()} />

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
