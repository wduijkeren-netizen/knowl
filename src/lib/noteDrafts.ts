export type NoteValues = { title: string; content: string; subject: string }
export type NoteDraft = NoteValues & { at: number }

const key = (id: string) => `knowl_note_draft_${id}`

/** Een lokale kopie wint alleen als hij nieuwer is dan de opgeslagen versie én echt iets anders bevat. */
export function shouldRestore(draft: NoteDraft | null, saved: NoteValues & { updated_at: string }) {
  if (!draft) return false
  const savedAt = Date.parse(saved.updated_at)
  if (Number.isFinite(savedAt) && draft.at <= savedAt) return false
  return draft.content !== saved.content || draft.title !== saved.title || draft.subject !== (saved.subject ?? '')
}

export function readDraft(id: string): NoteDraft | null {
  try {
    const raw = localStorage.getItem(key(id))
    if (!raw) return null
    if (raw.startsWith('{')) {
      const d = JSON.parse(raw)
      if (typeof d.content === 'string' && typeof d.at === 'number') return { title: d.title ?? '', content: d.content, subject: d.subject ?? '', at: d.at }
      return null
    }
    // oude opslagvorm: alleen de HTML, zonder tijdstip
    return { title: '', content: raw, subject: '', at: Number.MAX_SAFE_INTEGER, legacy: true } as NoteDraft
  } catch { return null }
}

export function writeDraft(id: string, values: NoteValues) {
  try { localStorage.setItem(key(id), JSON.stringify({ ...values, at: Date.now() })) } catch {}
}

export function clearDraft(id: string, ifContent?: string) {
  try {
    if (ifContent !== undefined) {
      const d = readDraft(id)
      if (d && d.content !== ifContent) return
    }
    localStorage.removeItem(key(id))
  } catch {}
}
