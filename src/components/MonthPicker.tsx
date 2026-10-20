import { addMonths, format } from 'date-fns'

type Props = { month: Date; onChange: (month: Date) => void }

export default function MonthPicker({ month, onChange }: Props) {
  const button = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100'
  return (
    <div className="flex items-center gap-2">
      <button className={button} onClick={() => onChange(addMonths(month, -1))} aria-label="Previous month">
        ◀
      </button>
      <span className="min-w-36 text-center font-medium">{format(month, 'MMMM yyyy')}</span>
      <button className={button} onClick={() => onChange(addMonths(month, 1))} aria-label="Next month">
        ▶
      </button>
    </div>
  )
}
