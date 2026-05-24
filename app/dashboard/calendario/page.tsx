import { getPedidosComEntrega } from './actions'
import { CalendarioContent } from './calendario-content'

export default async function CalendarioPage() {
  const pedidos = await getPedidosComEntrega()
  return <CalendarioContent pedidos={pedidos} />
}
