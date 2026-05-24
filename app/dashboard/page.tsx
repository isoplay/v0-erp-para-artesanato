import { getDashboardMetrics } from './actions'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics()

  return <DashboardContent metrics={metrics} />
}
