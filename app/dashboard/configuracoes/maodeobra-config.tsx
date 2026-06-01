'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ConfiguracaoMaodeobra, CategoriaProduto } from '@/lib/types/database'

interface MaodebraConfigProps {
  configuracoes: (ConfiguracaoMaodeobra & {
    categoria: CategoriaProduto
  })[]
}

export default function MaodebraConfigContent({ configuracoes }: MaodebraConfigProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Valores de Mão de Obra</CardTitle>
        <CardDescription>
          Visualize os custos atuais. A edição principal fica no cadastro de produtos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Produto</TableHead>
                <TableHead className="text-right font-semibold">Mão de Obra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configuracoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                    Nenhum custo configurado.
                  </TableCell>
                </TableRow>
              ) : (
                configuracoes.map((config) => (
                  <TableRow key={config.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{config.categoria?.nome}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm">
                        {formatCurrency(config.valor_maodeobra)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {configuracoes.length > 0 && configuracoes[0]?.descricao && (
          <p className="mt-2 text-xs text-muted-foreground">{configuracoes[0].descricao}</p>
        )}
      </CardContent>
    </Card>
  )
}
