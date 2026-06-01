import { getTodasConfiguracoesMaodeobra } from '@/app/dashboard/pedidos/builder-actions'
import { getTiposComponentesConfig } from './actions'
import ComponentesConfigContent from './componentes-config'
import MaodebraConfigContent from './maodeobra-config'

export default async function ConfiguracoesPage() {
  const [configuracoes, tiposComponentes] = await Promise.all([
    getTodasConfiguracoesMaodeobra(),
    getTiposComponentesConfig(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie tipos de componentes e acompanhe os custos cadastrados.
        </p>
      </div>

      <ComponentesConfigContent tipos={tiposComponentes} />
      <MaodebraConfigContent configuracoes={configuracoes} />
    </div>
  )
}
