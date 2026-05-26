'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, X } from 'lucide-react'
import type { Material } from '@/lib/types/database'
import type { ComposicaoInput } from '../actions'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

type Props = {
  materiais: Material[]
  composicao: ComposicaoInput[]
  onChange: (composicao: ComposicaoInput[]) => void
  valorMaodeobra: number
  margemLucro: number
  precoVenda: number
}

export function ComposicaoProdutoForm({
  materiais,
  composicao,
  onChange,
  valorMaodeobra,
  margemLucro,
  precoVenda,
}: Props) {
  const custos = useMemo(() => {
    let custoMateriais = 0
    const detalhes = composicao
      .filter((item) => item.material_id && item.quantidade_usada > 0)
      .map((item) => {
        const material = materiais.find((m) => m.id === item.material_id)
        const custoUnitario = material?.custo_unitario ?? 0
        const subtotal = custoUnitario * item.quantidade_usada
        custoMateriais += subtotal
        return {
          ...item,
          material_nome: material?.nome ?? '—',
          unidade: material?.unidade ?? '',
          custo_unitario: custoUnitario,
          subtotal,
        }
      })

    const custoTotal = custoMateriais + valorMaodeobra
    const precoSugerido =
      margemLucro >= 100 ? custoTotal * 2 : custoTotal / (1 - margemLucro / 100)
    const lucro = precoVenda - custoTotal
    const margemReal = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0

    return { detalhes, custoMateriais, custoTotal, precoSugerido, lucro, margemReal }
  }, [composicao, materiais, valorMaodeobra, margemLucro, precoVenda])

  function addLinha() {
    onChange([...composicao, { material_id: '', quantidade_usada: 1 }])
  }

  function removeLinha(index: number) {
    onChange(composicao.filter((_, i) => i !== index))
  }

  function updateLinha(
    index: number,
    field: 'material_id' | 'quantidade_usada',
    value: string | number
  ) {
    const updated = [...composicao]
    if (field === 'material_id') {
      updated[index].material_id = value as string
    } else {
      updated[index].quantidade_usada = value as number
    }
    onChange(updated)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Composicao do Produto</Label>
        <Button type="button" variant="outline" size="sm" onClick={addLinha}>
          <Plus className="mr-1 h-3 w-3" />
          Adicionar Material
        </Button>
      </div>

      {composicao.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Adicione os materiais da receita padrao deste produto.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="w-28">Qtd</TableHead>
                <TableHead className="text-right">Custo Un.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {composicao.map((item, index) => {
                const material = materiais.find((m) => m.id === item.material_id)
                const subtotal =
                  (material?.custo_unitario ?? 0) * (item.quantidade_usada || 0)
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={item.material_id}
                        onValueChange={(v) => updateLinha(index, 'material_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {materiais.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantidade_usada}
                        onChange={(e) =>
                          updateLinha(
                            index,
                            'quantidade_usada',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(material?.custo_unitario ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(subtotal)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLinha(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid gap-2 rounded-md bg-background p-3 text-sm sm:grid-cols-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Custo de Materiais</span>
          <span className="font-medium">{formatCurrency(custos.custoMateriais)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Mao de Obra</span>
          <span className="font-medium">{formatCurrency(valorMaodeobra)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Custo Total Estimado</span>
          <span className="font-semibold">{formatCurrency(custos.custoTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Preco Sugerido ({margemLucro}%)</span>
          <span className="font-medium text-blue-700">
            {formatCurrency(custos.precoSugerido)}
          </span>
        </div>
        <div className="flex justify-between sm:col-span-2 border-t pt-2">
          <span className="text-muted-foreground">Lucro Estimado (preco atual)</span>
          <span
            className={`font-semibold ${custos.lucro >= 0 ? 'text-green-700' : 'text-red-700'}`}
          >
            {formatCurrency(custos.lucro)} ({custos.margemReal.toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  )
}
