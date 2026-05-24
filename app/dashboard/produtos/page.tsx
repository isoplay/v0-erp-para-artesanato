import { getProdutos, getMateriais } from './actions'
import { ProdutosContent } from './produtos-content'

export default async function ProdutosPage() {
  const [produtos, materiais] = await Promise.all([
    getProdutos(),
    getMateriais(),
  ])

  return <ProdutosContent produtos={produtos} materiais={materiais} />
}
