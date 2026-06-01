import { getProdutos } from './actions'
import { ProdutosContent } from './produtos-content'

export default async function ProdutosPage() {
  const produtos = await getProdutos()

  return <ProdutosContent produtos={produtos} />
}
