import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../lib/types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, type, color')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCategories((data ?? []) as Category[])
      })
  }, [])

  return { categories, error }
}
