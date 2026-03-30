import { getPedidos, getProdutosAtivos } from './actions'
import { PedidosContent } from './pedidos-content'

export default async function PedidosPage() {
  const [pedidos, produtos] = await Promise.all([
    getPedidos(),
    getProdutosAtivos(),
  ])

  return <PedidosContent pedidos={pedidos} produtos={produtos} />
}
