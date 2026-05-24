'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { atualizarMaodeobra } from '@/app/dashboard/pedidos/builder-actions'
import type { ConfiguracaoMaodeobra, CategoriaProduto } from '@/lib/types/database'

interface MaodebraConfigProps {
  configuracoes: (ConfiguracaoMaodeobra & {
    categoria: CategoriaProduto
  })[]
}

export default function MaodebraConfigContent({ configuracoes }: MaodebraConfigProps) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const handleStartEdit = (id: string, currentValue: number) => {
    setEditingId(id)
    setEditValues({ [id]: currentValue.toFixed(2) })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValues({})
  }

  const handleSave = (id: string, categoria_id: string) => {
    const novoValor = parseFloat(editValues[id] || '0')

    if (isNaN(novoValor) || novoValor < 0) {
      toast.error('Valor inválido')
      return
    }

    startTransition(async () => {
      try {
        const result = await atualizarMaodeobra(categoria_id, novoValor)

        if (result.success) {
          toast.success('Mão de obra atualizada com sucesso')
          setEditingId(null)
          setEditValues({})
        } else {
          toast.error(result.error || 'Erro ao atualizar')
        }
      } catch (error) {
        console.error('Error updating labor cost:', error)
        toast.error('Erro ao atualizar mão de obra')
      }
    })
  }

  const handleInputChange = (id: string, value: string) => {
    setEditValues(prev => ({ ...prev, [id]: value }))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Valores de Mão de Obra</CardTitle>
          <CardDescription>
            Configure o valor de mão de obra para cada categoria de produto. Este valor será
            adicionado ao preço total de cada item montado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="font-semibold text-right">Mão de Obra</TableHead>
                  <TableHead className="font-semibold text-right w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configuracoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nenhuma categoria configurada
                    </TableCell>
                  </TableRow>
                ) : (
                  configuracoes.map(config => (
                    <TableRow key={config.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{config.categoria?.nome}</TableCell>
                      <TableCell className="text-right">
                        {editingId === config.id ? (
                          <div className="flex justify-end gap-2 items-center">
                            <span className="text-sm text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValues[config.id] || '0'}
                              onChange={e => handleInputChange(config.id, e.target.value)}
                              className="w-24 h-8 text-right"
                              disabled={isPending}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span className="font-mono text-sm">
                            {formatCurrency(config.valor_maodeobra)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === config.id ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSave(config.id, config.categoria_id)}
                              disabled={isPending}
                              className="h-8"
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={isPending}
                              className="h-8"
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleStartEdit(config.id, config.valor_maodeobra)
                            }
                            disabled={isPending}
                            className="h-8"
                          >
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {configuracoes.length > 0 && configuracoes[0]?.descricao && (
            <p className="text-xs text-muted-foreground mt-2">{configuracoes[0].descricao}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
