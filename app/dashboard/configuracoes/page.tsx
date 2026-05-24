import { getTodasConfiguracoesMaodeobra } from '@/app/dashboard/pedidos/builder-actions'
import MaodebraConfigContent from './maodeobra-config'

export default async function ConfiguracoesMaodebraPage() {
  const configuracoes = await getTodasConfiguracoesMaodeobra()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie valores de mão de obra por categoria</p>
      </div>

      <MaodebraConfigContent configuracoes={configuracoes} />
    </div>
  )
}
