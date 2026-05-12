'use client'

import { useState, useEffect } from 'react'

export default function DagelijkseHerinnering() {
  const [status, setStatus] = useState<'onbekend' | 'gevraagd' | 'toegestaan' | 'geweigerd'>('onbekend')
  const [tijd, setTijd] = useState('20:00')
  const [opgeslagen, setOpgeslagen] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) { setStatus('geweigerd'); return }
    setStatus(Notification.permission === 'granted' ? 'toegestaan' : Notification.permission === 'denied' ? 'geweigerd' : 'onbekend')
    const opgeslagenTijd = localStorage.getItem('knowl_herinnering_tijd')
    if (opgeslagenTijd) setTijd(opgeslagenTijd)
  }, [])

  async function vraagToestemming() {
    const result = await Notification.requestPermission()
    setStatus(result === 'granted' ? 'toegestaan' : 'geweigerd')
  }

  function slaOp() {
    localStorage.setItem('knowl_herinnering_tijd', tijd)
    localStorage.setItem('knowl_herinnering_aan', 'true')
    setOpgeslagen(true)
    setTimeout(() => setOpgeslagen(false), 2000)
    planHerinnering(tijd)
  }

  function zetUit() {
    localStorage.removeItem('knowl_herinnering_aan')
    localStorage.removeItem('knowl_herinnering_tijd')
  }

  if (!('Notification' in window) || status === 'geweigerd') return null

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-indigo-900">Dagelijkse herinnering</h2>
        <p className="text-sm text-indigo-400 mt-0.5">Ontvang een melding als je nog niet hebt geleerd.</p>
      </div>

      {status === 'onbekend' && (
        <button onClick={vraagToestemming}
          className="w-full bg-indigo-100 text-indigo-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-200 transition-colors">
          Meldingen inschakelen
        </button>
      )}

      {status === 'toegestaan' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 shrink-0">Herinner mij om</label>
            <input type="time" value={tijd} onChange={e => setTijd(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={slaOp}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors">
              {opgeslagen ? 'Opgeslagen ✓' : 'Opslaan'}
            </button>
            <button onClick={zetUit}
              className="text-sm text-gray-400 hover:text-gray-600 px-3 transition-colors">
              Uitzetten
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function planHerinnering(tijd: string) {
  if (!('serviceWorker' in navigator)) return
  const [uur, minuut] = tijd.split(':').map(Number)
  const nu = new Date()
  const gepland = new Date()
  gepland.setHours(uur, minuut, 0, 0)
  if (gepland <= nu) gepland.setDate(gepland.getDate() + 1)
  const vertraging = gepland.getTime() - nu.getTime()

  setTimeout(() => {
    const vandaag = new Date().toISOString().split('T')[0]
    const laatstGeleerd = localStorage.getItem('knowl_laatste_leermoment')
    if (laatstGeleerd !== vandaag) {
      new Notification('Knowl', {
        body: 'Je hebt vandaag nog niet geleerd. Zet nu een leermoment neer!',
        icon: '/favicon.png',
      })
    }
    planHerinnering(tijd)
  }, vertraging)
}
