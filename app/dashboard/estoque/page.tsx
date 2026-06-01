import { getMateriais } from './actions'
import { getTiposComponentesConfig } from '../configuracoes/actions'
import { EstoqueContent } from './estoque-content'

export default async function EstoquePage() {
  const [materiais, tiposComponentes] = await Promise.all([
    getMateriais(),
    getTiposComponentesConfig(),
  ])

  return <EstoqueContent materiais={materiais} tiposComponentes={tiposComponentes} />
}
