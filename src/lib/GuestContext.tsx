'use client'

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

type Moment = {
  id: string
  title: string
  description: string | null
  category: string | null
  learned_at: string
  duration_minutes: number | null
  photo_url: null
  is_public: false
  share_token: string
}

type Subject = { id: string; name: string; goal_minutes: null; goal_date: null; recurring_type: null; recurring_goal_minutes: null }

type GuestContextType = {
  moments: Moment[]
  subjects: Subject[]
  addMoment: (m: Omit<Moment, 'id' | 'photo_url' | 'is_public' | 'share_token'>) => void
  deleteMoment: (id: string) => void
  addSubject: (name: string) => void
  deleteSubject: (id: string) => void
  logGuestEvent: (event_type: string, metadata?: Record<string, unknown>) => void
}

const GuestContext = createContext<GuestContextType>({
  moments: [], subjects: [],
  addMoment: () => {}, deleteMoment: () => {},
  addSubject: () => {}, deleteSubject: () => {},
  logGuestEvent: () => {},
})

function getOrCreateSessionId(): { id: string; isNew: boolean } {
  try {
    const key = 'knowl_guest_session'
    const existing = localStorage.getItem(key)
    if (existing) return { id: existing, isNew: false }
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return { id, isNew: true }
  } catch {
    return { id: crypto.randomUUID(), isNew: true }
  }
}

export function GuestProvider({ children }: { children: ReactNode }) {
  const [moments, setMoments] = useState<Moment[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const supabase = useRef(createClient()).current
  const sessionId = useRef<string | null>(null)

  useEffect(() => {
    const { id, isNew } = getOrCreateSessionId()
    sessionId.current = id
    if (isNew) {
      supabase.from('guest_events').insert({ session_id: id, event_type: 'session_start' }).then(() => {})
    }
  }, [supabase])

  function logGuestEvent(event_type: string, metadata?: Record<string, unknown>) {
    if (!sessionId.current) return
    supabase.from('guest_events').insert({
      session_id: sessionId.current,
      event_type,
      metadata: metadata ?? null,
    }).then(() => {})
  }

  function addMoment(m: Omit<Moment, 'id' | 'photo_url' | 'is_public' | 'share_token'>) {
    setMoments(prev => [{
      ...m, id: crypto.randomUUID(), photo_url: null, is_public: false, share_token: crypto.randomUUID()
    }, ...prev])
    logGuestEvent('add_moment', { category: m.category, duration_minutes: m.duration_minutes })
  }

  function deleteMoment(id: string) {
    setMoments(prev => prev.filter(m => m.id !== id))
    logGuestEvent('delete_moment')
  }

  function addSubject(name: string) {
    setSubjects(prev => [...prev, {
      id: crypto.randomUUID(), name,
      goal_minutes: null, goal_date: null, recurring_type: null, recurring_goal_minutes: null
    }].sort((a, b) => a.name.localeCompare(b.name)))
    logGuestEvent('add_subject', { name })
  }

  function deleteSubject(id: string) {
    setSubjects(prev => prev.filter(s => s.id !== id))
    logGuestEvent('delete_subject')
  }

  return (
    <GuestContext.Provider value={{ moments, subjects, addMoment, deleteMoment, addSubject, deleteSubject, logGuestEvent }}>
      {children}
    </GuestContext.Provider>
  )
}

export function useGuest() {
  return useContext(GuestContext)
}
