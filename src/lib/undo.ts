import { toast } from 'sonner'
import { supabase } from './supabase'
import { refreshAll } from './refresh'

type Table = 'transactions' | 'budgets' | 'savings_goals' | 'category_rules' | 'recurring_transactions'

const UNDO_MS = 6000

// Deletes straight away and shows "<message> · Undo" for a few seconds.
// The delete returns the full row, so Undo puts back exactly what was there
// (same id, created_at and import_hash, so duplicate protection keeps working).
export async function deleteWithUndo(table: Table, id: string, message: string, detail?: string): Promise<string | undefined> {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select()
  if (error) {
    toast.error(`Couldn’t delete: ${error.message}`)
    return error.message
  }
  const rows = data ?? []
  toast(message, {
    description: detail,
    duration: UNDO_MS,
    action: { label: 'Undo', onClick: () => void restore(table, rows) },
  })
  return undefined
}

async function restore(table: Table, rows: object[]) {
  if (rows.length === 0) return
  const { error } = await supabase.from(table).insert(rows)
  if (error) {
    toast.error(`Couldn’t undo: ${error.message}`)
    return
  }
  toast.success('Restored')
  await refreshAll() // every page showing this data reloads it
}
