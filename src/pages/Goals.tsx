import { useState, type FormEvent, type ReactNode } from 'react'
import { addMonths, startOfMonth } from 'date-fns'
import GoalForm from '../components/GoalForm'
import GoalProgress from '../components/GoalProgress'
import { useMonthlyTotals } from '../hooks/useMonthlyTotals'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { formatRM } from '../lib/format'
import { EMERGENCY_FUND_NAME, averageMonthlyExpenses, roundUpTo100 } from '../lib/goals'
import type { SavingsGoal, SavingsGoalInput } from '../lib/types'

// Positive RM amount with at most 2 decimal places
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

export default function Goals() {
  const { goals, loaded, error, add, update, remove, contribute } = useSavingsGoals()
  const hasEmergencyFund = goals.some((g) => g.name.trim().toLowerCase() === EMERGENCY_FUND_NAME.toLowerCase())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Savings goals</h1>
        <p className="mt-1 text-sm text-slate-600">Track what you’re saving towards and how much to put aside each month.</p>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {loaded && !hasEmergencyFund && <EmergencyFundSuggestion onCreate={add} />}

      {goals.map((g) => (
        <GoalCard
          key={g.id}
          goal={g}
          onUpdate={(input) => update(g.id, input)}
          onContribute={(amount) => contribute(g, amount)}
          onRemove={() => remove(g.id)}
        />
      ))}

      <Card title="New goal">
        <GoalForm onSubmit={add} />
      </Card>
    </div>
  )
}

function EmergencyFundSuggestion({ onCreate }: { onCreate: (input: SavingsGoalInput) => Promise<string | undefined> }) {
  const [months, setMonths] = useState<3 | 6>(6)
  const [showForm, setShowForm] = useState(false)
  // the last three complete months, so this month's partial spending doesn't drag the average down
  const [lastFullMonth] = useState(() => addMonths(startOfMonth(new Date()), -1))
  const { totals, loading } = useMonthlyTotals(lastFullMonth, 3)
  const average = averageMonthlyExpenses(totals)
  const target = roundUpTo100(average * months)

  return (
    <Card title="🛟 Start an emergency fund">
      <p className="text-sm text-slate-600">
        An emergency fund covers job loss, medical bills or car repairs without debt. A common guide is{' '}
        <strong>3–6 months of expenses</strong>.
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Working out your average spending…</p>
      ) : average > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            You spent about <strong className="text-slate-900">{formatRM(average)}</strong> a month recently.
          </p>
          <div className="inline-grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            {([3, 6] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={`rounded-md px-3 py-1.5 ${months === m ? 'bg-white font-medium shadow-sm' : 'text-slate-600'}`}
              >
                {m} months
              </button>
            ))}
          </div>
          <p className="text-sm">
            Suggested target: <strong className="text-lg">{formatRM(target)}</strong>
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Add a few months of transactions and you’ll get a suggested target based on your spending.
        </p>
      )}

      {showForm ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <GoalForm
            defaults={{ name: EMERGENCY_FUND_NAME, target_amount: target || undefined }}
            onSubmit={onCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Set up emergency fund
        </button>
      )}
    </Card>
  )
}

type GoalCardProps = {
  goal: SavingsGoal
  onUpdate: (input: SavingsGoalInput) => Promise<string | undefined>
  onContribute: (amount: number) => Promise<string | undefined>
  onRemove: () => Promise<string | undefined>
}

function GoalCard({ goal, onUpdate, onContribute, onRemove }: GoalCardProps) {
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function move(e: FormEvent, direction: 1 | -1) {
    e.preventDefault()
    const clean = amount.trim().replace(/,/g, '')
    if (!AMOUNT_PATTERN.test(clean) || Number(clean) <= 0) {
      return setMessage({ ok: false, text: 'Enter an amount above RM 0 with at most 2 decimals.' })
    }
    const value = Number(clean)
    if (direction === -1 && value > goal.current_amount) {
      return setMessage({ ok: false, text: `You can withdraw at most ${formatRM(goal.current_amount)}.` })
    }
    setBusy(true)
    const error = await onContribute(direction * value)
    setBusy(false)
    if (error) {
      setMessage({ ok: false, text: error })
    } else {
      setMessage({ ok: true, text: `${direction === 1 ? 'Added' : 'Withdrew'} ${formatRM(value)}.` })
      setAmount('')
    }
  }

  async function handleRemove() {
    if (!window.confirm(`Delete the goal “${goal.name}”? This can’t be undone.`)) return
    const error = await onRemove()
    if (error) window.alert(error)
  }

  if (editing) {
    return (
      <Card title={`Edit “${goal.name}”`}>
        <GoalForm
          initial={goal}
          onSubmit={async (input) => {
            const error = await onUpdate(input)
            if (!error) setEditing(false)
            return error
          }}
          onCancel={() => setEditing(false)}
        />
      </Card>
    )
  }

  return (
    <Card
      title={goal.name}
      actions={
        <div className="flex gap-1 text-sm">
          <button onClick={() => setEditing(true)} className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100">
            Edit
          </button>
          <button onClick={handleRemove} className="rounded px-2 py-1 text-red-700 hover:bg-red-50">
            Delete
          </button>
        </div>
      }
    >
      <GoalProgress goal={goal} />
      <form onSubmit={(e) => move(e, 1)} className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">RM</span>
        <input
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={`Amount for ${goal.name}`}
          className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Add savings
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => move(e, -1)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60"
        >
          Withdraw
        </button>
        {message && <p className={`w-full text-sm ${message.ok ? 'text-green-700' : 'text-red-700'}`}>{message.text}</p>}
      </form>
    </Card>
  )
}

function Card({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  )
}
