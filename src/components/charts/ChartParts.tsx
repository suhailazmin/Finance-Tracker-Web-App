import type { ReactNode } from 'react'
import { formatRM } from '../../lib/format'

export type TooltipRow = { label: string; color: string; value: number }

export function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-md ring-1 ring-slate-200">
      <p className="font-medium text-slate-900">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="mt-0.5 flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
          {r.label}
          <span className="ml-auto pl-3 tabular-nums text-slate-900">{formatRM(r.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex gap-4 text-sm text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

// Accessible alternative to the chart: the same numbers as a table
export function TableView({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Show as table</summary>
      <table className="mt-2 w-full tabular-nums">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            {headers.map((h, i) => (
              <th key={h} className={`py-1 font-medium ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b border-slate-100">
              {cells.map((c, i) => (
                <td key={i} className={`py-1 ${i > 0 ? 'text-right' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
