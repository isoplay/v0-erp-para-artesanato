import { getPedidos, getProdutosAtivos, getMateriaisDisponiveis } from './actions'
import { PedidosContent } from './pedidos-content'

export default async function PedidosPage() {
  const [pedidos, produtos, materiais] = await Promise.all([
    getPedidos(),
    getProdutosAtivos(),
    getMateriaisDisponiveis(),
  ])

  return <PedidosContent pedidos={pedidos} produtos={produtos} materiais={materiais} />
}
