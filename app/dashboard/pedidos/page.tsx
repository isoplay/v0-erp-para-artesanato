import { getPedidos, getProdutosAtivos, getMateriaisDisponiveis } from './actions'
import { PedidosContent } from './pedidos-content'
import { Suspense } from 'react'

export default async function PedidosPage() {
  const [pedidos, produtos, materiais] = await Promise.all([
    getPedidos(),
    getProdutosAtivos(),
    getMateriaisDisponiveis(),
  ])

  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Carregando pedidos...</div>}>
      <PedidosContent pedidos={pedidos} produtos={produtos} materiais={materiais} />
    </Suspense>
  )
}
