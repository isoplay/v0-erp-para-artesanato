'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  TrendingUp,
  Clock,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import type { Pedido, Material } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type DashboardMetrics = {
  totalPedidosMes: number
  receitaMes: number
  pedidosPendentes: number
  materiaisBaixoEstoque: number
  despesasTotalMes: number
  lucroMes: number
  pedidosRecentes: Pedido[]
  materiaisLowStock: Material[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800'
    case 'em_producao':
      return 'bg-blue-100 text-blue-800'
    case 'pronto':
      return 'bg-green-100 text-green-800'
    case 'entregue':
      return 'bg-gray-100 text-gray-800'
    case 'cancelado':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pendente':
      return 'Pendente'
    case 'em_producao':
      return 'Em Producao'
    case 'pronto':
      return 'Pronto'
    case 'entregue':
      return 'Entregue'
    case 'cancelado':
      return 'Cancelado'
    default:
      return status
  }
}

export function DashboardContent({ metrics }: { metrics: DashboardMetrics }) {
  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Visao geral do seu negocio em {currentMonth}
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos do Mes
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPedidosMes}</div>
            <p className="text-xs text-muted-foreground mt-1">pedidos realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita do Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.receitaMes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">em vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {metrics.pedidosPendentes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">aguardando producao</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estoque Baixo
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.materiaisBaixoEstoque}
            </div>
            <p className="text-xs text-muted-foreground mt-1">materiais a repor</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-700">
              {formatCurrency(metrics.receitaMes)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-700">
              {formatCurrency(metrics.despesasTotalMes)}
            </div>
          </CardContent>
        </Card>

        <Card className={metrics.lucroMes >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${metrics.lucroMes >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
              <Wallet className="h-4 w-4" />
              Lucro Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${metrics.lucroMes >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {formatCurrency(metrics.lucroMes)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders and Low Stock */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
            <CardDescription>Ultimos pedidos cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.pedidosRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum pedido cadastrado ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {metrics.pedidosRecentes.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{pedido.cliente_nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(pedido.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={getStatusColor(pedido.status)}>
                        {getStatusLabel(pedido.status)}
                      </Badge>
                      <span className="font-medium text-sm">
                        {formatCurrency(pedido.valor_total - pedido.desconto)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Materiais com Estoque Baixo</CardTitle>
            <CardDescription>Itens que precisam de reposicao</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.materiaisLowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Todos os materiais estao com estoque adequado.
              </p>
            ) : (
              <div className="space-y-4">
                {metrics.materiaisLowStock.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{material.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        Minimo: {material.quantidade_minima} {material.unidade}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">
                        {material.quantidade_atual} {material.unidade}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
