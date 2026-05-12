'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useStudyTimer(activity: string, title: string) {
  const startRef = useRef(Date.now())
  const savedRef = useRef(false)

  async function save() {
    if (savedRef.current) return
    const duration = Math.round((Date.now() - startRef.current) / 1000)
    if (duration < 15) return
    savedRef.current = true
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('study_sessions').insert({ user_id: user.id, activity, title, duration_seconds: duration })
  }

  useEffect(() => {
    startRef.current = Date.now()
    savedRef.current = false
    return () => { save() }
  }, [title])

  return { save }
}
