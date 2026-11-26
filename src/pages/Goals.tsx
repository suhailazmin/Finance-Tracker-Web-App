import { useState, type FormEvent } from 'react'
import { addMonths, startOfMonth } from 'date-fns'
import { LifeBuoy, Minus, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import { ErrorAlert, FormMessage } from '../components/Feedback'
import GoalForm from '../components/GoalForm'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import SegmentedControl from '../components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      <PageHeader
        title="Savings goals"
        description="Track what you’re saving towards and how much to put aside each month."
      />
      {error && <ErrorAlert message={error} />}

      {loaded && !hasEmergencyFund && <EmergencyFundSuggestion onCreate={add} />}

      {goals.length > 0 && (
        <div className="grid items-start gap-6 md:grid-cols-2">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onUpdate={(input) => update(g.id, input)}
              onContribute={(amount) => contribute(g, amount)}
              onRemove={() => remove(g.id)}
            />
          ))}
        </div>
      )}

      <SectionCard title="New goal" icon={Plus}>
        <GoalForm onSubmit={add} />
      </SectionCard>
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
    <SectionCard
      title="Start an emergency fund"
      icon={LifeBuoy}
      tone="orange"
      className="bg-gradient-to-br from-brand-orange/10 to-card ring-brand-orange/25"
    >
      <p className="text-sm text-muted-foreground">
        An emergency fund covers job loss, medical bills or car repairs without debt. A common guide is{' '}
        <strong className="text-foreground">3–6 months of expenses</strong>.
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Working out your average spending…</p>
      ) : average > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            You spent about <strong className="text-foreground">{formatRM(average)}</strong> a month recently.
          </p>
          <SegmentedControl
            label="Months of expenses"
            className="inline-grid"
            value={months}
            onChange={setMonths}
            options={[
              { value: 3, label: '3 months' },
              { value: 6, label: '6 months' },
            ]}
          />
          <p className="text-sm">
            Suggested target: <strong className="text-lg tabular-nums">{formatRM(target)}</strong>
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Add a few months of transactions and you’ll get a suggested target based on your spending.
        </p>
      )}

      {showForm ? (
        <div className="mt-4 border-t pt-4">
          <GoalForm
            defaults={{ name: EMERGENCY_FUND_NAME, target_amount: target || undefined }}
            onSubmit={onCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} className="mt-4">
          Set up emergency fund
        </Button>
      )}
    </SectionCard>
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

  if (editing) {
    return (
      <SectionCard title={`Edit “${goal.name}”`} icon={Pencil}>
        <GoalForm
          initial={goal}
          onSubmit={async (input) => {
            const error = await onUpdate(input)
            if (!error) setEditing(false)
            return error
          }}
          onCancel={() => setEditing(false)}
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title={goal.name}
      icon={PiggyBank}
      tone="orange"
      actions={
        <div className="-mr-2 flex">
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label={`Edit ${goal.name}`} title="Edit">
            <Pencil />
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${goal.name}`}
                title="Delete"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 />
              </Button>
            }
            icon={Trash2}
            destructive
            title={`Delete “${goal.name}”?`}
            description={`The goal and its ${formatRM(goal.current_amount)} saved so far will be removed from Monetra. This can’t be undone.`}
            confirmLabel="Delete goal"
            onConfirm={onRemove}
          />
        </div>
      }
    >
      <GoalProgress goal={goal} />
      <form onSubmit={(e) => move(e, 1)} className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">RM</span>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={`Amount for ${goal.name}`}
          className="w-28"
        />
        <Button type="submit" disabled={busy}>
          <Plus />
          Add savings
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={(e) => move(e, -1)}>
          <Minus />
          Withdraw
        </Button>
        {message && (
          <FormMessage ok={message.ok} className="w-full">
            {message.text}
          </FormMessage>
        )}
      </form>
    </SectionCard>
  )
}
