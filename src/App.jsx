import { useState } from 'react'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

const fieldClass = 'flex flex-1 basis-32 flex-col gap-1 text-sm'
const controlClass = 'rounded border border-gray-300 p-2 text-base'
const cellClass = 'border-b border-gray-200 p-3'

function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function App() {
  const [valueCents, setValueCents] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [entries, setEntries] = useState([])

  function handleValueChange(e) {
    setValueCents(e.target.value.replace(/\D/g, ''))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (Number(valueCents) <= 0 || month === '' || year === '') return

    const entry = {
      id: crypto.randomUUID(),
      cents: Number(valueCents),
      month: Number(month),
      year: Number(year),
    }

    setEntries((prev) =>
      [...prev, entry].sort((a, b) => a.year - b.year || a.month - b.month),
    )

    setValueCents('')
    setMonth('')
    setYear('')
  }

  function handleRemove(id) {
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const total = entries.reduce((sum, entry) => sum + entry.cents, 0)

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Lançamentos</h1>

        <form className="mb-8 flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
          <label className={fieldClass}>
            Valor
            <input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              className={controlClass}
              value={valueCents ? formatBRL(Number(valueCents)) : ''}
              onChange={handleValueChange}
            />
          </label>

          <label className={fieldClass}>
            Mês
            <select
              className={controlClass}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">Selecione</option>
              {MONTHS.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className={fieldClass}>
            Ano
            <select
              className={controlClass}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Selecione</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="rounded bg-green-700 px-5 py-2 text-base text-white hover:bg-green-800"
          >
            Adicionar
          </button>
        </form>

        <div className="overflow-hidden rounded shadow-sm">
          <table className="w-full border-collapse bg-white text-left">
            <thead>
              <tr className="bg-gray-50 text-sm">
                <th className={cellClass}>Mês</th>
                <th className={cellClass}>Ano</th>
                <th className={`${cellClass} text-right`}>Valor</th>
                <th className={cellClass} aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-gray-500">
                    Nenhum lançamento ainda
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className={cellClass}>{MONTHS[entry.month]}</td>
                    <td className={cellClass}>{entry.year}</td>
                    <td className={`${cellClass} text-right`}>
                      {formatBRL(entry.cents)}
                    </td>
                    <td className={`${cellClass} text-right`}>
                      <button
                        type="button"
                        className="text-xl leading-none text-red-700 hover:text-red-900"
                        onClick={() => handleRemove(entry.id)}
                        aria-label="Remover"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="font-semibold">
                  <td className="p-3" colSpan={2}>
                    Total
                  </td>
                  <td className="p-3 text-right">{formatBRL(total)}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>
    </div>
  )
}

export default App
