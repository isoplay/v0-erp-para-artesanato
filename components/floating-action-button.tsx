'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function FloatingActionButton() {
  return (
    <Button
      asChild
      size="lg"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8 md:h-16 md:w-auto md:rounded-full md:px-6"
    >
      <Link href="/dashboard/pedidos?novo=1" aria-label="Novo pedido">
        <Plus className="h-6 w-6 md:mr-2" />
        <span className="hidden md:inline">Novo Pedido</span>
      </Link>
    </Button>
  )
}
