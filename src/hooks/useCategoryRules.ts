import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { deleteWithUndo } from '../lib/undo'
import { beginLoad, useRefreshVersion } from '../lib/refresh'
import { normalizeKeyword } from '../lib/categorize'
import type { CategoryRule } from '../lib/types'

export function useCategoryRules() {
  // reload when the user pulls to refresh
  const refreshVersion = useRefreshVersion()
  const [version, setVersion] = useState(0)
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const done = beginLoad()
    supabase
      .from('category_rules')
      .select('id, keyword, category_id, priority')
      .order('keyword')
      .then(({ data, error }) => {
        done()
        if (ignore) return
        setError(error?.message ?? '')
        setRules((data ?? []) as CategoryRule[])
      })
    return () => {
      ignore = true
      done()
    }
  }, [version, refreshVersion])

  const refresh = () => setVersion((v) => v + 1)

  async function add(keyword: string, categoryId: string, priority = 0) {
    const { error } = await supabase
      .from('category_rules')
      .insert({ keyword: normalizeKeyword(keyword), category_id: categoryId, priority })
    if (!error) refresh()
    return error?.message
  }

  // deletes at once; the toast offers Undo
  async function remove(id: string, detail?: string) {
    const error = await deleteWithUndo('category_rules', id, 'Rule deleted', detail)
    if (!error) refresh()
    return error
  }

  return { rules, error, add, remove }
}
