import type { ReactNode } from 'react'
import { endOfMonth, format } from 'date-fns'
import { CircleHelp, Info, Telescope, TrendingDown, TrendingUp, TriangleAlert, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
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

// "At this pace you'll spend about RM X this month". Every number says where it comes from, because
// people make decisions with it: which days were used, everyday spending vs recurring bills, and
// what can throw it off (too few days, one big purchase).
export default function ForecastCard({ forecast, month, income, previousExpenses, previousName, className }: Props) {
  const { spent, projected, everydaySpent, recurringSpent, everydayRate, everydayRest, upcomingRecurring, upcoming, daysElapsed, daysLeft, early, oneOff } =
    forecast
  const stillToCome = everydayRest + upcomingRecurring
  const scale = Math.max(projected, income, 1)
  const overIncome = income > 0 && projected > income
  const diff = previousExpenses ? projected - previousExpenses : null
  const monthShort = format(month, 'MMM')
  const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`
  const names = upcoming.map((u) => u.description)
  const upcomingNames = names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ')

  return (
    <SectionCard
      id="forecast"
      title="Month-end forecast"
      description={`Based on what you recorded from 1–${daysElapsed} ${monthShort}${upcoming.length ? ' and recurring payments still to come' : ''}`}
      icon={Telescope}
      tone="orange"
      className={className}
    >
      <p className="text-sm text-muted-foreground">At this pace you’ll spend about</p>
      <p className="text-3xl font-extrabold tracking-tight">{formatRM(Math.round(projected))}</p>
      <p className="text-sm text-muted-foreground">by {format(endOfMonth(month), 'd MMMM')}</p>

      {/* the practical answer: what should be left of this month's income */}
      {income > 0 && (
        <p
          className={cn(
            'mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm',
            overIncome ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'
          )}
        >
          {overIncome ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <Wallet className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span>
            {overIncome ? (
              <>
                About <strong>{formatRM(Math.round(projected - income))}</strong> more than you’ve earned this month
              </>
            ) : (
              <>
                About <strong>{formatRM(Math.round(income - projected))}</strong> of this month’s income left at month end
              </>
            )}
          </span>
        </p>
      )}

      {/* how reliable it is */}
      {early && (
        <Note tone="warning">
          Only {days(daysElapsed)} of spending so far, so this is a rough estimate. It gets more reliable after the first week.
        </Note>
      )}
      {oneOff && (
        <Note tone="info">
          One big purchase, “{oneOff.description}” ({formatRM(oneOff.amount)}), raises your daily rate. If it was a one-off,
          expect about <strong>{formatRM(Math.round(oneOff.projectedWithout))}</strong> instead.
        </Note>
      )}

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
            style={{ width: `${(stillToCome / scale) * 100}%`, backgroundColor: `color-mix(in srgb, ${chartColors.expenses} 35%, var(--card))` }}
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
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: `color-mix(in srgb, ${chartColors.expenses} 35%, var(--card))` }} />
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

      {/* everyday spending and recurring bills, kept apart */}
      <dl className="mt-4 space-y-2 text-sm">
        <Line label="Everyday spending so far">
          {formatRM(everydaySpent)} over {days(daysElapsed)} · about {formatRM(Math.round(everydayRate))} a day
        </Line>
        {daysLeft > 0 && (
          <Line label="Everyday spending still expected">
            about {formatRM(Math.round(everydayRest))} ({formatRM(Math.round(everydayRate))} × {days(daysLeft)} left)
          </Line>
        )}
        {recurringSpent > 0 && <Line label="Recurring bills already added">{formatRM(recurringSpent)}</Line>}
        {upcomingRecurring > 0 && (
          <Line label="Recurring bills still to come">
            {formatRM(upcomingRecurring)} · {upcomingNames}
          </Line>
        )}
      </dl>

      {diff !== null && Math.abs(diff) >= 1 && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          {diff > 0 ? <TrendingUp className="size-4 shrink-0" aria-hidden="true" /> : <TrendingDown className="size-4 shrink-0" aria-hidden="true" />}
          About {formatRM(Math.round(Math.abs(diff)))} {diff > 0 ? 'more' : 'less'} than you spent in {previousName}
        </p>
      )}

      <details className="group mt-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-primary [&::-webkit-details-marker]:hidden">
          <CircleHelp className="size-4" aria-hidden="true" />
          How this is worked out
        </summary>
        <div className="mt-2 space-y-1.5 text-muted-foreground">
          <p>
            What you’ve spent so far, plus your everyday spending rate for each day left, plus recurring bills that haven’t been
            added yet. Recurring bills like rent aren’t counted in the daily rate, so they aren’t repeated.
          </p>
          <p>
            It assumes the rest of {format(month, 'MMMM')} looks like the days so far. A one-off purchase, spending you haven’t
            recorded yet, or a bill that isn’t set up in Recurring will make it less accurate.
          </p>
        </div>
      </details>
    </SectionCard>
  )
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  )
}

function Note({ tone, children }: { tone: 'warning' | 'info'; children: ReactNode }) {
  const Icon = tone === 'warning' ? TriangleAlert : Info
  return (
    <p
      className={cn(
        'mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm',
        tone === 'warning' ? 'bg-brand-orange/15 text-brand-orange-ink' : 'bg-muted text-foreground'
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
