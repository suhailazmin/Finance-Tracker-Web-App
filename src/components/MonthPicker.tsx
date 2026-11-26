import { addMonths, format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = { month: Date; onChange: (month: Date) => void }

export default function MonthPicker({ month, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={() => onChange(addMonths(month, -1))} aria-label="Previous month">
        <ChevronLeft />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
      <Button variant="outline" size="icon" onClick={() => onChange(addMonths(month, 1))} aria-label="Next month">
        <ChevronRight />
      </Button>
    </div>
  )
}
