import { endOfMonth, format } from 'date-fns'
import { Telescope, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import SectionCard from './SectionCard'
import { chartColors } from '../lib/chartTheme'
import { formatRM } from '../lib/format'
import type { Forecast } from '../lib/forecast'

type Props = {
  forecast: Forecast
  month: Date
  income: number
  previousExpenses?: number
  previousName: string
  className?: string
}

// "At this pace you'll spend about RM X this month", with a bar of spent vs still expected
export default function ForecastCard({ forecast, month, income, previousExpenses, previousName, className }: Props) {
  const { spent, projected, everydayRest, upcomingRecurring, early } = forecast
  const stillToCome = everydayRest + upcomingRecurring
  const scale = Math.max(projected, income, 1)
  const overIncome = income > 0 && projected > income
  const diff = previousExpenses ? projected - previousExpenses : null

  return (
    <SectionCard
      title="Month-end forecast"
      description={early ? 'Early estimate: only a few days of spending so far' : `Based on your spending since 1 ${format(month, 'MMM')}`}
      icon={Telescope}
      tone="orange"
      className={className}
    >
      <p className="text-sm text-muted-foreground">At this pace you’ll spend about</p>
      <p className="text-3xl font-extrabold tracking-tight">{formatRM(Math.round(projected))}</p>
      <p className="text-sm text-muted-foreground">by {format(endOfMonth(month), 'd MMMM')}</p>

      {/* spent so far (solid) + still expected (light), against income */}
      <div className="mt-4">
        <div
          className="relative flex h-3 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`Spent ${formatRM(spent)} so far, about ${formatRM(stillToCome)} more expected${income > 0 ? `, income ${formatRM(income)}` : ''}`}
        >
          <div className="h-full" style={{ width: `${(spent / scale) * 100}%`, backgroundColor: chartColors.expenses }} />
          <div
            className="h-full border-l-2 border-card"
            style={{ width: `${(stillToCome / scale) * 100}%`, backgroundColor: `color-mix(in srgb, ${chartColors.expenses} 35%, white)` }}
          />
          {income > 0 && (
            <div className="absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: `calc(${Math.min(1, income / scale) * 100}% - 1px)` }} />
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: chartColors.expenses }} />
            Spent so far <strong className="text-foreground">{formatRM(spent)}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: `color-mix(in srgb, ${chartColors.expenses} 35%, white)` }} />
            Still expected <strong className="text-foreground">about {formatRM(Math.round(stillToCome))}</strong>
          </span>
          {income > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 bg-foreground/70" />
              Income {formatRM(income)}
            </span>
          )}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        {upcomingRecurring > 0 && (
          <li className="text-muted-foreground">Includes {formatRM(Math.round(upcomingRecurring))} of recurring bills still to come.</li>
        )}
        {overIncome ? (
          <li className="flex items-start gap-1.5 font-semibold text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            That’s about {formatRM(Math.round(projected - income))} more than you’ve earned this month.
          </li>
        ) : (
          income > 0 && (
            <li className="text-muted-foreground">
              That would leave about <strong className="text-foreground">{formatRM(Math.round(income - projected))}</strong> of this month’s income.
            </li>
          )
        )}
        {diff !== null && Math.abs(diff) >= 1 && (
          <li className="flex items-center gap-1.5 text-muted-foreground">
            {diff > 0 ? <TrendingUp className="size-4 shrink-0" aria-hidden="true" /> : <TrendingDown className="size-4 shrink-0" aria-hidden="true" />}
            About {formatRM(Math.round(Math.abs(diff)))} {diff > 0 ? 'more' : 'less'} than you spent in {previousName}
          </li>
        )}
      </ul>
    </SectionCard>
  )
}
