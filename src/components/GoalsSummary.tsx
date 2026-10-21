import { Link } from 'react-router-dom'
import GoalProgress from './GoalProgress'
import type { SavingsGoal } from '../lib/types'

// Dashboard card: unfinished goals first, up to `limit`
export default function GoalsSummary({ goals, limit = 3 }: { goals: SavingsGoal[]; limit?: number }) {
  if (goals.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No savings goals yet.{' '}
        <Link to="/goals" className="text-emerald-700 hover:underline">
          Start an emergency fund →
        </Link>
      </p>
    )
  }

  const sorted = [...goals].sort(
    (a, b) => Number(a.current_amount >= a.target_amount) - Number(b.current_amount >= b.target_amount)
  )

  return (
    <div className="space-y-5">
      {sorted.slice(0, limit).map((g) => (
        <div key={g.id}>
          <p className="mb-1 text-sm font-medium text-slate-800">{g.name}</p>
          <GoalProgress goal={g} />
        </div>
      ))}
      <Link to="/goals" className="inline-block text-sm text-emerald-700 hover:underline">
        {goals.length > limit ? `See all ${goals.length} goals →` : 'Manage goals →'}
      </Link>
    </div>
  )
}
