'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

export function FloatingActionButton() {
  const isMobile = useIsMobile()

  // FAB visível apenas em mobile (touch devices menores) para ações rápidas
  if (!isMobile) return null

  return (
    <Button
      asChild
      size="lg"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
      aria-label="Novo pedido"
    >
      <Link href="/dashboard/pedidos?novo=1">
        <Plus className="h-6 w-6" />
      </Link>
    </Button>
  )
}
