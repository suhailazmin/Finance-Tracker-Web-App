import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CircleAlert, CircleCheck, ListChecks, TriangleAlert, type LucideIcon } from 'lucide-react'
import SectionCard from './SectionCard'
import { Button } from '@/components/ui/button'
import { statusStyle } from '../lib/budget'
import { MAX_PRIORITIES, type Priority, type PriorityTone } from '../lib/priorities'

// Same status colours as the budgets, always with an icon and words
const LOOK: Record<PriorityTone, { icon: LucideIcon; color: string; label: string }> = {
  danger: { icon: CircleAlert, color: statusStyle.over.color, label: 'Needs action' },
  warning: { icon: TriangleAlert, color: statusStyle.warning.color, label: 'Worth a look' },
  good: { icon: CircleCheck, color: statusStyle.good.color, label: 'Good news' },
}

// "Your priorities": what needs doing this month, most urgent first, each with one next step
export default function PrioritiesCard({ priorities, className }: { priorities: Priority[]; className?: string }) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? priorities : priorities.slice(0, MAX_PRIORITIES)
  const hidden = priorities.length - shown.length

  return (
    <SectionCard title="Your priorities" description="What needs your attention this month" icon={ListChecks} className={className}>
      {priorities.length === 0 ? (
        <p className="flex items-center gap-2 text-sm">
          <CircleCheck className="size-5 shrink-0" style={{ color: statusStyle.good.color }} aria-hidden="true" />
          Nothing needs your attention right now.
        </p>
      ) : (
        <ul className="-my-1 divide-y divide-border/70">
          {shown.map((p) => (
            <PriorityRow key={p.id} priority={p} />
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <Button variant="ghost" size="sm" className="mt-2 -ml-2.5 font-bold text-primary hover:text-primary" onClick={() => setShowAll(true)}>
          Show {hidden} more
        </Button>
      )}
    </SectionCard>
  )
}

function PriorityRow({ priority }: { priority: Priority }) {
  const look = LOOK[priority.tone]
  const Icon = look.icon
  const actionClass = 'mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-primary hover:underline'
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-5 shrink-0" style={{ color: look.color }} aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <p className="font-bold">
          <span className="sr-only">{look.label}: </span>
          {priority.title}
        </p>
        <p className="text-muted-foreground">{priority.text}</p>
        {priority.action.to.startsWith('#') ? (
          // a card further down this page
          <a href={priority.action.to} className={actionClass}>
            {priority.action.label}
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </a>
        ) : (
          <Link to={priority.action.to} className={actionClass}>
            {priority.action.label}
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </li>
  )
}
