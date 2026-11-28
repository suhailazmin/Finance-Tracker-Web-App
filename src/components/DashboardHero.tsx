import { useState } from 'react'
import { format } from 'date-fns'
import { PiggyBank } from 'lucide-react'
import monetraIcon from '../assets/monetra-icon.png'
import { formatRM, surplusLabel } from '../lib/format'
import HideAmountsButton from './HideAmountsButton'

// Green card: the month's surplus (income minus spending) as the headline number, with the mascot
export default function DashboardHero({ month, surplus, income }: { month: Date; surplus: number; income: number }) {
  // read the clock once, when the banner first appears
  const [hour] = useState(() => new Date().getHours())
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const kept = income > 0 ? Math.round((surplus / income) * 100) : null

  return (
    <section className="relative flex h-full min-h-52 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-brand-forest to-brand-leaf p-6 text-white shadow-xl shadow-brand-forest/25">
      {/* soft decorative shapes */}
      <span className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-white/10" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-brand-orange/15" aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white/85">{greeting} 👋</p>
          <p className="mt-0.5 text-xs text-white/65">Here’s how {format(month, 'MMMM')} is going</p>
        </div>
        <img src={monetraIcon} alt="" width={96} height={96} className="size-16 shrink-0 rotate-6 drop-shadow-xl sm:size-20" />
      </div>

      <div className="relative mt-4">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-white/75">{surplusLabel(surplus)}</p>
          <HideAmountsButton className="size-7 text-white/80 hover:bg-white/15 hover:text-white [&_svg]:size-4" />
        </div>
        <p className="text-4xl font-extrabold tracking-tight sm:text-[2.75rem]">{formatRM(Math.abs(surplus))}</p>
        <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          <PiggyBank className="size-3.5 shrink-0" aria-hidden="true" />
          {kept === null
            ? 'No income recorded this month'
            : kept >= 0
              ? `Income minus spending in ${format(month, 'MMMM')}`
              : `You’ve spent ${formatRM(-surplus)} more than you earned`}
        </p>
      </div>
    </section>
  )
}
