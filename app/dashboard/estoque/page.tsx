import { getMateriais } from './actions'
import { EstoqueContent } from './estoque-content'

export default async function EstoquePage() {
  const materiais = await getMateriais()

  return <EstoqueContent materiais={materiais} />
}
