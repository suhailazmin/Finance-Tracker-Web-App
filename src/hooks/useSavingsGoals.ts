import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { deleteWithUndo } from '../lib/undo'
import { beginLoad, useRefreshVersion } from '../lib/refresh'
import type { SavingsGoal, SavingsGoalInput } from '../lib/types'

export function useSavingsGoals() {
  // reload when the user pulls to refresh
  const refreshVersion = useRefreshVersion()
  const [version, setVersion] = useState(0)
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const done = beginLoad()
    supabase
      .from('savings_goals')
      .select('id, name, target_amount, current_amount, target_date')
      .order('name')
      .then(({ data, error }) => {
        done()
        if (ignore) return
        setError(error?.message ?? '')
        // numeric columns come back as strings from PostgREST
        setGoals(
          ((data ?? []) as SavingsGoal[]).map((g) => ({
            ...g,
            target_amount: Number(g.target_amount),
            current_amount: Number(g.current_amount),
          }))
        )
        setLoaded(true)
      })
    return () => {
      ignore = true
      done()
    }
  }, [version, refreshVersion])

  const refresh = () => setVersion((v) => v + 1)

  async function add(input: SavingsGoalInput) {
    const { error } = await supabase.from('savings_goals').insert(input)
    if (!error) refresh()
    return error?.message
  }

  async function update(id: string, input: Partial<SavingsGoalInput>) {
    const { error } = await supabase.from('savings_goals').update(input).eq('id', id)
    if (!error) refresh()
    return error?.message
  }

  // deletes at once; the toast offers Undo
  async function remove(id: string, detail?: string) {
    const error = await deleteWithUndo('savings_goals', id, 'Goal deleted', detail)
    if (!error) refresh()
    return error
  }

  // Positive amount adds savings, negative withdraws; never below RM 0
  async function contribute(goal: SavingsGoal, amount: number) {
    const next = Math.max(0, Math.round((goal.current_amount + amount) * 100) / 100)
    return update(goal.id, { current_amount: next })
  }

  return { goals, loaded, error, add, update, remove, contribute }
}
