import { getPedidos, getMateriaisDisponiveis, getCategoriasComComponentes } from './actions'
import { PedidosContent } from './pedidos-content'
import { Suspense } from 'react'

export default async function PedidosPage() {
  const [pedidos, materiais, dadosForm] = await Promise.all([
    getPedidos(),
    getMateriaisDisponiveis(),
    getCategoriasComComponentes(),
  ])

  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Carregando pedidos...</div>}>
      <PedidosContent 
        pedidos={pedidos} 
        materiais={materiais}
        categorias={dadosForm.categorias}
        grupos={dadosForm.grupos}
        componentes={dadosForm.componentes}
        maodeobra={dadosForm.maodeobra}
      />
    </Suspense>
  )
}
