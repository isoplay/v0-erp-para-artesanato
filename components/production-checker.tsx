'use client'

import { useState, useEffect, useCallback } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, Clock, Package } from 'lucide-react'
import { verificarMateriaisProducao, type VerificacaoProducao } from '@/app/dashboard/pedidos/actions'

type ProductionCheckerProps = {
  itens: { produto_id: string; quantidade: number }[]
}

export function ProductionChecker({ itens }: ProductionCheckerProps) {
  const [verificacoes, setVerificacoes] = useState<VerificacaoProducao[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const verificar = useCallback(async () => {
    if (itens.length === 0 || itens.every(i => !i.produto_id)) {
      setVerificacoes([])
      return
    }

    const validItens = itens.filter(i => i.produto_id && i.quantidade > 0)
    if (validItens.length === 0) {
      setVerificacoes([])
      return
    }

    setIsLoading(true)
    try {
      const result = await verificarMateriaisProducao(validItens)
      setVerificacoes(result)
    } catch (error) {
      console.error('Error checking production:', error)
    } finally {
      setIsLoading(false)
    }
  }, [itens])

  useEffect(() => {
    const timer = setTimeout(() => {
      verificar()
    }, 500)
    return () => clearTimeout(timer)
  }, [verificar])

  if (itens.length === 0 || verificacoes.length === 0) return null

  const todosPodeProuzir = verificacoes.every(v => v.pode_produzir)
  const tempoTotal = verificacoes.reduce((acc, v) => acc + v.tempo_producao_total, 0)
  const horas = Math.floor(tempoTotal / 60)
  const minutos = tempoTotal % 60

  return (
    <div className="space-y-3">
      {/* Summary Alert */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
          <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          Verificando estoque...
        </div>
      ) : todosPodeProuzir ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Estoque Disponivel</AlertTitle>
          <AlertDescription className="text-green-700">
            <div className="flex flex-wrap gap-4 mt-1">
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                <span>{verificacoes.length} produto(s)</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  Tempo estimado: {horas > 0 ? `${horas}h ` : ''}{minutos}min
                </span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Estoque Insuficiente</AlertTitle>
          <AlertDescription className="text-amber-700">
            Alguns materiais nao estao disponiveis para producao completa.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed breakdown - only show if there are issues */}
      {!todosPodeProuzir && (
        <div className="space-y-2">
          {verificacoes.filter(v => !v.pode_produzir).map((v) => (
            <div key={v.produto_id} className="text-sm border rounded-md p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{v.produto_nome}</span>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  Max: {v.quantidade_maxima} un
                </Badge>
              </div>
              <div className="space-y-1">
                {v.materiais.filter(m => !m.suficiente).map((m) => (
                  <div key={m.material_id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{m.material_nome}</span>
                    <span className="text-red-600">
                      Falta: {(m.quantidade_necessaria - m.quantidade_disponivel).toFixed(1)} {m.unidade}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
