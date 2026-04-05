import { getFinanceiroResumo, getDespesas } from './actions'
import { FinanceiroContent } from './financeiro-content'

export default async function FinanceiroPage() {
  const now = new Date()
  const mes = now.getMonth()
  const ano = now.getFullYear()

  const [resumo, despesas] = await Promise.all([
    getFinanceiroResumo(mes, ano),
    getDespesas(mes, ano),
  ])

  return <FinanceiroContent resumo={resumo} despesas={despesas} mesAtual={mes} anoAtual={ano} />
}
