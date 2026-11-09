export const SUBJECT_PALETTE = [
  '#7c3aed', // paars
  '#0d9488', // teal
  '#ea580c', // oranje
  '#db2777', // roze
  '#2563eb', // blauw
  '#16a34a', // groen
  '#ca8a04', // oker
  '#0891b2', // cyaan
  '#c026d3', // fuchsia
  '#65a30d', // limoen
]
export const NO_SUBJECT_COLOR = '#64748b'

function hash(name: string) {
  let h = 0
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/**
 * Vaste kleur per vak, afgeleid van de vaknaam. Botsen twee vakken op dezelfde kleur,
 * dan schuift het (alfabetisch) latere vak door naar de eerstvolgende vrije kleur.
 */
export function buildSubjectColors(names: Iterable<string>) {
  const colors: Record<string, string> = {}
  const used = new Set<number>()
  for (const name of Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))) {
    let i = hash(name) % SUBJECT_PALETTE.length
    for (let tries = 0; used.has(i) && tries < SUBJECT_PALETTE.length; tries++) i = (i + 1) % SUBJECT_PALETTE.length
    used.add(i)
    colors[name] = SUBJECT_PALETTE[i]
  }
  return colors
}
