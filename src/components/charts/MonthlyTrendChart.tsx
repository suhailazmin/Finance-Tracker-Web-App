import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { axisTick, chartColors, hoverCursor, yAxisProps } from '../../lib/chartTheme'
import { formatRM } from '../../lib/format'
import type { MonthTotal } from '../../hooks/useMonthlyTotals'
import { ChartTooltip, Legend, TableView } from './ChartParts'

type Row = MonthTotal & { short: string; long: string }

export default function MonthlyTrendChart({ totals }: { totals: MonthTotal[] }) {
  const data: Row[] = totals.map((t) => {
    const d = parseISO(`${t.month}-01`)
    return { ...t, short: format(d, 'MMM'), long: format(d, 'MMMM yyyy') }
  })

  return (
    <>
      <Legend
        items={[
          { label: 'Income', color: chartColors.income },
          { label: 'Expenses', color: chartColors.expenses },
        ]}
      />
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="short" tickLine={false} axisLine={{ stroke: chartColors.baseline }} tick={axisTick} />
            <YAxis {...yAxisProps} />
            <Tooltip
              cursor={hoverCursor}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as Row | undefined
                if (!active || !row) return null
                return (
                  <ChartTooltip
                    title={row.long}
                    rows={[
                      { label: 'Income', color: chartColors.income, value: row.income },
                      { label: 'Expenses', color: chartColors.expenses, value: row.expenses },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey="income" name="Income" fill={chartColors.income} radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="expenses" name="Expenses" fill={chartColors.expenses} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView
        headers={['Month', 'Income', 'Expenses', 'Balance']}
        rows={data.map((r) => [r.long, formatRM(r.income), formatRM(r.expenses), formatRM(r.income - r.expenses)])}
      />
    </>
  )
}
