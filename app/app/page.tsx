import { Suspense } from 'react'
import { Dashboard } from '@/components/dashboard/Dashboard'

export default function AppPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  )
}
