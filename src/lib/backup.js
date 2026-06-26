// Gera e baixa um arquivo JSON com todos os lançamentos.
export function downloadEntries(entries) {
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
export function parseEntriesFile(text) {
  const data = JSON.parse(text)
  const list = Array.isArray(data) ? data : data?.entries
  if (!Array.isArray(list)) {
    throw new Error('formato não reconhecido')
  }

  return list
    .map((e) => {
      const kind = e.kind === 'tax' ? 'tax' : 'revenue'
      const entry = {
        key: e.key ?? crypto.randomUUID(),
        cents: Number(e.cents),
        month: Number(e.month),
        year: Number(e.year),
        kind,
      }
      if (kind === 'tax') {
        entry.description = typeof e.description === 'string' ? e.description : ''
        entry.category =
          e.category === 'expense' || e.category === 'fee' ? e.category : 'tax'
      } else {
        entry.market = e.market === 'external' ? 'external' : 'internal'
      }
      return entry
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
