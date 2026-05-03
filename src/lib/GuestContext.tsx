'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

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
}

const GuestContext = createContext<GuestContextType>({
  moments: [], subjects: [],
  addMoment: () => {}, deleteMoment: () => {},
  addSubject: () => {}, deleteSubject: () => {},
})

export function GuestProvider({ children }: { children: ReactNode }) {
  const [moments, setMoments] = useState<Moment[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  function addMoment(m: Omit<Moment, 'id' | 'photo_url' | 'is_public' | 'share_token'>) {
    setMoments(prev => [{
      ...m, id: crypto.randomUUID(), photo_url: null, is_public: false, share_token: crypto.randomUUID()
    }, ...prev])
  }

  function deleteMoment(id: string) {
    setMoments(prev => prev.filter(m => m.id !== id))
  }

  function addSubject(name: string) {
    setSubjects(prev => [...prev, {
      id: crypto.randomUUID(), name,
      goal_minutes: null, goal_date: null, recurring_type: null, recurring_goal_minutes: null
    }].sort((a, b) => a.name.localeCompare(b.name)))
  }

  function deleteSubject(id: string) {
    setSubjects(prev => prev.filter(s => s.id !== id))
  }

  return (
    <GuestContext.Provider value={{ moments, subjects, addMoment, deleteMoment, addSubject, deleteSubject }}>
      {children}
    </GuestContext.Provider>
  )
}

export function useGuest() {
  return useContext(GuestContext)
}
