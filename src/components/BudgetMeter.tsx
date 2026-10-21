import { budgetStatus, statusStyle } from '../lib/budget'
import { formatRM } from '../lib/format'

type Props = {
  spent: number
  limit: number
  // 0–1: how far through the month we are; draws a "today" marker
  pace?: number
}

export default function BudgetMeter({ spent, limit, pace }: Props) {
  const status = budgetStatus(spent, limit)
  const style = statusStyle[status]
  const used = limit > 0 ? spent / limit : 0
  const left = limit - spent

  return (
    <div>
      <div className="relative h-2.5 rounded-full bg-slate-100" title={`${Math.round(used * 100)}% used`}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(used, 1) * 100}%`, backgroundColor: style.color }}
        />
        {pace !== undefined && pace > 0 && pace < 1 && (
          <div
            className="absolute -top-1 h-4.5 w-0.5 rounded bg-slate-500"
            style={{ left: `${pace * 100}%` }}
            title="Today"
          />
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: style.color }}
            aria-hidden="true"
          >
            {style.icon}
          </span>
          {style.label}
        </span>
        <span className="tabular-nums">
          {left >= 0 ? `${formatRM(left)} left` : `${formatRM(-left)} over`}
        </span>
      </div>
    </div>
  )
}
