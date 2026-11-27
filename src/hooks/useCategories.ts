import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { beginLoad, useRefreshVersion } from '../lib/refresh'
import type { Category } from '../lib/types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  // reload when the user pulls to refresh
  const refreshVersion = useRefreshVersion()

  useEffect(() => {
    let ignore = false
    const done = beginLoad()
    supabase
      .from('categories')
      .select('id, name, type, color')
      .order('name')
      .then(({ data, error }) => {
        done()
        if (ignore) return
        if (error) setError(error.message)
        else setCategories((data ?? []) as Category[])
      })
    return () => {
      ignore = true
      done()
    }
  }, [refreshVersion])

  return { categories, error }
}
