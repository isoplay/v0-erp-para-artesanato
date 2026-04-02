'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronLeft, ChevronRight, Phone, Clock } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { PedidoCalendario } from './actions'
import Link from 'next/link'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const statusStyles: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  em_producao: 'bg-blue-100 text-blue-800 border-blue-200',
  pronto: 'bg-green-100 text-green-800 border-green-200',
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Producao',
  pronto: 'Pronto',
}

export function CalendarioContent({ pedidos }: { pedidos: PedidoCalendario[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  function getPedidosForDate(date: Date) {
    return pedidos.filter((p) => {
      if (!p.data_entrega) return false
      return isSameDay(parseISO(p.data_entrega), date)
    })
  }

  const selectedPedidos = selectedDate ? getPedidosForDate(selectedDate) : []

  // Group upcoming deliveries
  const hoje = new Date()
  const entregasHoje = pedidos.filter((p) => p.data_entrega && isSameDay(parseISO(p.data_entrega), hoje))
  const entregasAtrasadas = pedidos.filter(
    (p) => p.data_entrega && parseISO(p.data_entrega) < hoje && !isSameDay(parseISO(p.data_entrega), hoje)
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendario de Entregas</h1>
        <p className="text-muted-foreground">Visualize e acompanhe as entregas programadas</p>
      </div>

      {/* Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        {entregasAtrasadas.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Entregas Atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-700">{entregasAtrasadas.length}</p>
              <p className="text-xs text-red-600">pedido(s) precisam de atencao</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Entregas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{entregasHoje.length}</p>
            <p className="text-xs text-amber-600">pedido(s) para entregar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  Hoje
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {/* Day headers */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
                <div key={day} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {/* Days */}
              {days.map((day) => {
                const dayPedidos = getPedidosForDate(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, currentMonth)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      bg-background p-2 min-h-[80px] text-left transition-colors relative
                      ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}
                      ${isToday(day) ? 'bg-primary/5' : ''}
                      ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                      hover:bg-accent
                    `}
                  >
                    <span
                      className={`
                        text-sm font-medium
                        ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayPedidos.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {dayPedidos.slice(0, 2).map((p) => (
                          <div
                            key={p.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${statusStyles[p.status] || 'bg-gray-100'}`}
                          >
                            {p.cliente_nome.split(' ')[0]}
                          </div>
                        ))}
                        {dayPedidos.length > 2 && (
                          <div className="text-xs text-muted-foreground">+{dayPedidos.length - 2} mais</div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
            </CardTitle>
            <CardDescription>
              {selectedPedidos.length} entrega(s) programada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Clique em uma data no calendario para ver os detalhes
              </p>
            ) : selectedPedidos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma entrega programada para esta data
              </p>
            ) : (
              <div className="space-y-3">
                {selectedPedidos.map((pedido) => (
                  <div key={pedido.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{pedido.cliente_nome}</p>
                        {pedido.cliente_telefone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {pedido.cliente_telefone}
                          </p>
                        )}
                      </div>
                      <Badge className={statusStyles[pedido.status] || ''}>
                        {statusLabels[pedido.status] || pedido.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium">{formatCurrency(pedido.valor_total - pedido.desconto)}</span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href="/dashboard/pedidos">Ver Pedido</Link>
                    </Button>
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
