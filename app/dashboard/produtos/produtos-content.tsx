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
import { Plus, MoreHorizontal, Package, Search, Pencil, Trash2, Eye, X } from 'lucide-react'
import type { Material, ProdutoComMateriais } from '@/lib/types/database'
import { createProduto, updateProduto, deleteProduto, toggleProdutoAtivo } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
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

type MaterialInput = {
  material_id: string
  quantidade: number
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
  const [selectedMateriais, setSelectedMateriais] = useState<MaterialInput[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const filteredProdutos = produtos.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategoria = categoriaFilter === 'all' || p.categoria === categoriaFilter
    return matchesSearch && matchesCategoria
  })

  function addMaterial() {
    setSelectedMateriais([...selectedMateriais, { material_id: '', quantidade: 1 }])
  }

  function removeMaterial(index: number) {
    setSelectedMateriais(selectedMateriais.filter((_, i) => i !== index))
  }

  function updateMaterialItem(index: number, field: 'material_id' | 'quantidade', value: string | number) {
    const updated = [...selectedMateriais]
    if (field === 'material_id') {
      updated[index].material_id = value as string
    } else {
      updated[index].quantidade = value as number
    }
    setSelectedMateriais(updated)
  }

  async function handleCreate(formData: FormData) {
    const validMateriais = selectedMateriais.filter((m) => m.material_id && m.quantidade > 0)
    startTransition(async () => {
      const result = await createProduto(formData, validMateriais)
      if (result.success) {
        toast.success('Produto cadastrado com sucesso!')
        setIsAddOpen(false)
        setSelectedMateriais([])
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao cadastrar produto')
      }
    })
  }

  async function handleUpdate(formData: FormData) {
    if (!selectedProduto) return
    const validMateriais = selectedMateriais.filter((m) => m.material_id && m.quantidade > 0)
    startTransition(async () => {
      const result = await updateProduto(selectedProduto.id, formData, validMateriais)
      if (result.success) {
        toast.success('Produto atualizado com sucesso!')
        setIsEditOpen(false)
        setSelectedProduto(null)
        setSelectedMateriais([])
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
    setSelectedMateriais(
      produto.produto_materiais.map((pm) => ({
        material_id: pm.material.id,
        quantidade: pm.quantidade,
      }))
    )
    setIsEditOpen(true)
  }

  function openView(produto: ProdutoComMateriais) {
    setSelectedProduto(produto)
    setIsViewOpen(true)
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
          if (!open) setSelectedMateriais([])
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
                Crie um novo produto e defina sua composicao de materiais
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" name="nome" required placeholder="Ex: Terco de Cristal" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select name="categoria" required defaultValue="terco">
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
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descricao</Label>
                <Textarea id="descricao" name="descricao" placeholder="Descricao do produto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco_venda">Preco de Venda *</Label>
                  <Input
                    id="preco_venda"
                    name="preco_venda"
                    type="number"
                    step="0.01"
                    required
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempo_producao_minutos">Tempo de Producao (min)</Label>
                  <Input
                    id="tempo_producao_minutos"
                    name="tempo_producao_minutos"
                    type="number"
                    defaultValue="30"
                  />
                </div>
              </div>

              {/* Materials composition */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Composicao de Materiais</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
                {selectedMateriais.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum material adicionado. O custo sera calculado automaticamente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedMateriais.map((mat, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={mat.material_id}
                          onValueChange={(v) => updateMaterialItem(index, 'material_id', v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materiais.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.nome} ({formatCurrency(m.custo_unitario)}/{m.unidade})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={mat.quantidade}
                          onChange={(e) =>
                            updateMaterialItem(index, 'quantidade', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                          placeholder="Qtd"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaterial(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Preco</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutos.map((produto) => {
                    const margin = calculateMargin(produto.preco_venda, produto.custo_producao)
                    return (
                      <TableRow key={produto.id} className={!produto.ativo ? 'opacity-50' : ''}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{produto.nome}</span>
                            {produto.descricao && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {produto.descricao}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getCategoriaLabel(produto.categoria)}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(produto.custo_producao)}
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
              {getCategoriaLabel(selectedProduto?.categoria || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedProduto && (
            <div className="space-y-4">
              {selectedProduto.descricao && (
                <p className="text-sm text-muted-foreground">{selectedProduto.descricao}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Preco de Venda</p>
                  <p className="font-medium">{formatCurrency(selectedProduto.preco_venda)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo de Producao</p>
                  <p className="font-medium">{formatCurrency(selectedProduto.custo_producao)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Margem de Lucro</p>
                  <p className="font-medium">
                    {calculateMargin(selectedProduto.preco_venda, selectedProduto.custo_producao).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tempo de Producao</p>
                  <p className="font-medium">{selectedProduto.tempo_producao_minutos} minutos</p>
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
                          {pm.quantidade} {pm.material.unidade}
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
          setSelectedMateriais([])
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Atualize as informacoes do produto
            </DialogDescription>
          </DialogHeader>
          {selectedProduto && (
            <form action={handleUpdate} className="space-y-4">
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
                  <Label htmlFor="edit-categoria">Categoria *</Label>
                  <Select name="categoria" defaultValue={selectedProduto.categoria}>
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
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-descricao">Descricao</Label>
                <Textarea
                  id="edit-descricao"
                  name="descricao"
                  defaultValue={selectedProduto.descricao || ''}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-preco_venda">Preco de Venda *</Label>
                  <Input
                    id="edit-preco_venda"
                    name="preco_venda"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={selectedProduto.preco_venda}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tempo_producao_minutos">Tempo de Producao (min)</Label>
                  <Input
                    id="edit-tempo_producao_minutos"
                    name="tempo_producao_minutos"
                    type="number"
                    defaultValue={selectedProduto.tempo_producao_minutos}
                  />
                </div>
              </div>
              <input type="hidden" name="ativo" value={selectedProduto.ativo.toString()} />

              {/* Materials composition */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Composicao de Materiais</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
                {selectedMateriais.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum material adicionado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedMateriais.map((mat, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={mat.material_id}
                          onValueChange={(v) => updateMaterialItem(index, 'material_id', v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materiais.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.nome} ({formatCurrency(m.custo_unitario)}/{m.unidade})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={mat.quantidade}
                          onChange={(e) =>
                            updateMaterialItem(index, 'quantidade', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                          placeholder="Qtd"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaterial(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
