import type { Entry } from '@/types'

// Gera e baixa um arquivo JSON com todos os lançamentos.
export function downloadEntries(entries: Entry[]): void {
  const payload = {
    app: 'accounts',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `lancamentos-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// Lê o conteúdo de um arquivo exportado e devolve os lançamentos já
// normalizados/validados. Aceita { entries: [...] } ou um array direto.
export function parseEntriesFile(text: string): Entry[] {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data)
    ? data
    : (data as { entries?: unknown } | null)?.entries
  if (!Array.isArray(list)) {
    throw new Error('formato não reconhecido')
  }

  return list
    .map((e): Entry => {
      const base = {
        key: e.key ?? crypto.randomUUID(),
        cents: Number(e.cents),
        month: Number(e.month),
        year: Number(e.year),
        entity: e.entity === 'pf' ? ('pf' as const) : ('pj' as const),
      }
      if (e.kind === 'tax') {
        // Cobrança recorrente: um inteiro positivo de meses, ou sem fim (null).
        const rawMonths = Number(e.recurrence?.months)
        const recurrence = e.recurrence
          ? { months: Number.isInteger(rawMonths) && rawMonths > 0 ? rawMonths : null }
          : undefined
        return {
          ...base,
          kind: 'tax',
          description: typeof e.description === 'string' ? e.description : '',
          ...(recurrence ? { recurrence } : {}),
        }
      }
      if (e.kind === 'prolabore') {
        return { ...base, kind: 'prolabore' }
      }
      return {
        ...base,
        kind: 'revenue',
        market: e.market === 'external' ? 'external' : 'internal',
      }
    })
    .filter(
      (e) =>
        Number.isFinite(e.cents) &&
        e.cents > 0 &&
        Number.isInteger(e.month) &&
        e.month >= 0 &&
        e.month <= 11 &&
        Number.isInteger(e.year) &&
        e.year > 0,
    )
}
