import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns'
import { axisTick, chartColors, hoverCursor, yAxisProps } from '../../lib/chartTheme'
import { formatRM } from '../../lib/format'
import type { Transaction } from '../../lib/types'
import { ChartTooltip, TableView } from './ChartParts'

type Row = { date: string; day: string; label: string; amount: number }

export default function DailySpendingChart({ transactions, month }: { transactions: Transaction[]; month: Date }) {
  const byDate = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amount)
  }

  const data: Row[] = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).map((d) => {
    const date = format(d, 'yyyy-MM-dd')
    return { date, day: format(d, 'd'), label: format(d, 'EEE, d MMM'), amount: byDate.get(date) ?? 0 }
  })

  return (
    <>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={{ stroke: chartColors.baseline }}
              tick={axisTick}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis {...yAxisProps} />
            <Tooltip
              cursor={hoverCursor}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as Row | undefined
                if (!active || !row) return null
                return (
                  <ChartTooltip
                    title={row.label}
                    rows={[{ label: 'Spent', color: chartColors.expenses, value: row.amount }]}
                  />
                )
              }}
            />
            <Bar dataKey="amount" fill={chartColors.expenses} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView
        headers={['Day', 'Spent']}
        rows={data.filter((r) => r.amount > 0).map((r) => [r.label, formatRM(r.amount)])}
      />
    </>
  )
}
