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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Package, ArrowUp, ArrowDown, Search, Pencil, Trash2 } from 'lucide-react'
import type { Material, TipoMovimentacao } from '@/lib/types/database'
import { createMaterial, updateMaterial, deleteMaterial, registrarMovimentacao } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const unidades = [
  { value: 'un', label: 'Unidade' },
  { value: 'g', label: 'Gramas' },
  { value: 'kg', label: 'Quilogramas' },
  { value: 'm', label: 'Metros' },
  { value: 'cm', label: 'Centimetros' },
  { value: 'pct', label: 'Pacote' },
  { value: 'cx', label: 'Caixa' },
  { value: 'par', label: 'Par' },
]

export function EstoqueContent({ materiais }: { materiais: Material[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isMovOpen, setIsMovOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const filteredMateriais = materiais.filter(
    (m) =>
      m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createMaterial(formData)
      if (result.success) {
        toast.success('Material cadastrado com sucesso!')
        setIsAddOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao cadastrar material')
      }
    })
  }

  async function handleUpdate(formData: FormData) {
    if (!selectedMaterial) return
    startTransition(async () => {
      const result = await updateMaterial(selectedMaterial.id, formData)
      if (result.success) {
        toast.success('Material atualizado com sucesso!')
        setIsEditOpen(false)
        setSelectedMaterial(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao atualizar material')
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este material?')) return
    startTransition(async () => {
      const result = await deleteMaterial(id)
      if (result.success) {
        toast.success('Material excluido com sucesso!')
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao excluir material')
      }
    })
  }

  async function handleMovimentacao(formData: FormData) {
    if (!selectedMaterial) return
    const tipo = formData.get('tipo') as TipoMovimentacao
    const quantidade = parseFloat(formData.get('quantidade') as string)
    const motivo = formData.get('motivo') as string

    startTransition(async () => {
      const result = await registrarMovimentacao(selectedMaterial.id, tipo, quantidade, motivo)
      if (result.success) {
        toast.success('Movimentacao registrada com sucesso!')
        setIsMovOpen(false)
        setSelectedMaterial(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao registrar movimentacao')
      }
    })
  }

  function getStockStatus(material: Material) {
    if (material.quantidade_atual <= 0) {
      return { label: 'Sem Estoque', className: 'bg-red-100 text-red-800' }
    }
    if (material.quantidade_atual <= material.quantidade_minima) {
      return { label: 'Estoque Baixo', className: 'bg-yellow-100 text-yellow-800' }
    }
    return { label: 'OK', className: 'bg-green-100 text-green-800' }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Estoque de Materiais</h1>
          <p className="text-muted-foreground">
            Gerencie os materiais utilizados na producao
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Material</DialogTitle>
              <DialogDescription>
                Adicione um novo material ao estoque
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" required placeholder="Ex: Conta de cristal azul" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descricao</Label>
                <Textarea id="descricao" name="descricao" placeholder="Descricao opcional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade *</Label>
                  <Select name="unidade" required defaultValue="un">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantidade_atual">Qtd Inicial</Label>
                  <Input
                    id="quantidade_atual"
                    name="quantidade_atual"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade_minima">Qtd Minima</Label>
                  <Input
                    id="quantidade_minima"
                    name="quantidade_minima"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custo_unitario">Custo Unit.</Label>
                  <Input
                    id="custo_unitario"
                    name="custo_unitario"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                    placeholder="R$"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input id="fornecedor" name="fornecedor" placeholder="Nome do fornecedor" />
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Materiais ({filteredMateriais.length})
          </CardTitle>
          <CardDescription>Lista de todos os materiais cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMateriais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum material encontrado' : 'Nenhum material cadastrado ainda'}
              </p>
              {!searchTerm && (
                <Button
                  variant="link"
                  onClick={() => setIsAddOpen(true)}
                  className="mt-2"
                >
                  Cadastrar primeiro material
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Minimo</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMateriais.map((material) => {
                    const status = getStockStatus(material)
                    return (
                      <TableRow key={material.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{material.nome}</span>
                            {material.fornecedor && (
                              <span className="text-xs text-muted-foreground">
                                {material.fornecedor}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {material.quantidade_atual} {material.unidade}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {material.quantidade_minima} {material.unidade}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(material.custo_unitario)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMaterial(material)
                                  setIsMovOpen(true)
                                }}
                              >
                                <ArrowUp className="mr-2 h-4 w-4 text-green-600" />
                                Entrada
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMaterial(material)
                                  setIsMovOpen(true)
                                }}
                              >
                                <ArrowDown className="mr-2 h-4 w-4 text-red-600" />
                                Saida
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMaterial(material)
                                  setIsEditOpen(true)
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(material.id)}
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
            <DialogDescription>
              Atualize as informacoes do material
            </DialogDescription>
          </DialogHeader>
          {selectedMaterial && (
            <form action={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome *</Label>
                <Input
                  id="edit-nome"
                  name="nome"
                  required
                  defaultValue={selectedMaterial.nome}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-descricao">Descricao</Label>
                <Textarea
                  id="edit-descricao"
                  name="descricao"
                  defaultValue={selectedMaterial.descricao || ''}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-unidade">Unidade *</Label>
                  <Select name="unidade" defaultValue={selectedMaterial.unidade}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-quantidade_minima">Qtd Minima</Label>
                  <Input
                    id="edit-quantidade_minima"
                    name="quantidade_minima"
                    type="number"
                    step="0.01"
                    defaultValue={selectedMaterial.quantidade_minima}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-custo_unitario">Custo Unit.</Label>
                  <Input
                    id="edit-custo_unitario"
                    name="custo_unitario"
                    type="number"
                    step="0.01"
                    defaultValue={selectedMaterial.custo_unitario}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fornecedor">Fornecedor</Label>
                  <Input
                    id="edit-fornecedor"
                    name="fornecedor"
                    defaultValue={selectedMaterial.fornecedor || ''}
                  />
                </div>
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

      {/* Movement Dialog */}
      <Dialog open={isMovOpen} onOpenChange={setIsMovOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Movimentar Estoque</DialogTitle>
            <DialogDescription>
              {selectedMaterial?.nome} - Atual: {selectedMaterial?.quantidade_atual}{' '}
              {selectedMaterial?.unidade}
            </DialogDescription>
          </DialogHeader>
          <form action={handleMovimentacao} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Movimentacao *</Label>
              <Select name="tipo" required defaultValue="entrada">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saida</SelectItem>
                  <SelectItem value="ajuste">Ajuste (definir quantidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                name="quantidade"
                type="number"
                step="0.01"
                required
                min="0"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Textarea
                id="motivo"
                name="motivo"
                placeholder="Ex: Compra de fornecedor, uso em producao..."
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Registrando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
