import { format, parseISO } from 'date-fns'
import { chartColors } from '../lib/chartTheme'
import { formatRM } from '../lib/format'
import { goalPlan } from '../lib/goals'
import type { SavingsGoal } from '../lib/types'

// Progress bar plus a one-line plan, shared by the Goals page and the dashboard
export default function GoalProgress({ goal }: { goal: SavingsGoal }) {
  const share = goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0
  const plan = goalPlan(goal)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="tabular-nums text-slate-600">
          <span className="font-semibold text-slate-900">{formatRM(goal.current_amount)}</span> of{' '}
          {formatRM(goal.target_amount)}
        </span>
        <span className="tabular-nums text-slate-600">{Math.floor(share * 100)}%</span>
      </div>
      <div className="mt-1.5 h-2.5 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(share, 1) * 100}%`, backgroundColor: chartColors.savings }}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-600">{planText(plan, goal)}</p>
    </div>
  )
}

function planText(plan: ReturnType<typeof goalPlan>, goal: SavingsGoal) {
  const remaining = formatRM(Math.max(0, goal.target_amount - goal.current_amount))
  const by = goal.target_date ? format(parseISO(goal.target_date), 'MMM yyyy') : ''
  switch (plan.kind) {
    case 'reached':
      return '🎉 Goal reached!'
    case 'no-date':
      return `${remaining} to go`
    case 'overdue':
      return `${remaining} to go · target date (${by}) has passed`
    case 'monthly':
      return `Save ${formatRM(plan.perMonth)}/month for ${plan.months} month${plan.months === 1 ? '' : 's'} to reach it by ${by}`
  }
}
