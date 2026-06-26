import { Fragment, useEffect, useState } from 'react'
import { deleteEntry, getAllEntries, putEntry } from './db'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const now = new Date()
const currentMonth = String(now.getMonth())
const currentYear = now.getFullYear()
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
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(String(currentYear))
  const [isExternal, setIsExternal] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [entries, setEntries] = useState([])

  useEffect(() => {
    getAllEntries().then((stored) =>
      setEntries(stored.sort((a, b) => b.year - a.year || b.month - a.month)),
    )
  }, [])

  function handleValueChange(e) {
    setValueCents(e.target.value.replace(/\D/g, ''))
  }

  function resetForm() {
    setValueCents('')
    setMonth(currentMonth)
    setYear(String(currentYear))
    setIsExternal(false)
    setEditingKey(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (Number(valueCents) <= 0 || month === '' || year === '') return

    const entry = {
      key: editingKey ?? crypto.randomUUID(),
      cents: Number(valueCents),
      month: Number(month),
      year: Number(year),
      market: isExternal ? 'external' : 'internal',
    }

    await putEntry(entry)

    setEntries((prev) =>
      [...prev.filter((e) => e.key !== entry.key), entry].sort(
        (a, b) => b.year - a.year || b.month - a.month,
      ),
    )

    if (editingKey) {
      resetForm()
    } else {
      // Keep month/year so several entries can be added in a row.
      setValueCents('')
      setIsExternal(false)
    }
  }

  function handleEdit(entry) {
    setEditingKey(entry.key)
    setValueCents(String(entry.cents))
    setMonth(String(entry.month))
    setYear(String(entry.year))
    setIsExternal(entry.market === 'external')
  }

  async function handleRemove(key) {
    await deleteEntry(key)
    setEntries((prev) => prev.filter((entry) => entry.key !== key))
    if (key === editingKey) resetForm()
  }

  const groups = []
  for (const entry of entries) {
    const last = groups[groups.length - 1]
    if (last && last.month === entry.month && last.year === entry.year) {
      last.entries.push(entry)
      last.cents += entry.cents
    } else {
      groups.push({
        month: entry.month,
        year: entry.year,
        cents: entry.cents,
        entries: [entry],
      })
    }
  }

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

          <label className="flex items-center gap-2 py-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={isExternal}
              onChange={(e) => setIsExternal(e.target.checked)}
            />
            Mercado externo
          </label>

          <button
            type="submit"
            className="rounded bg-green-700 px-5 py-2 text-base text-white hover:bg-green-800"
          >
            {editingKey ? 'Salvar' : 'Adicionar'}
          </button>

          {editingKey && (
            <button
              type="button"
              className="rounded border border-gray-300 px-5 py-2 text-base hover:bg-gray-100"
              onClick={resetForm}
            >
              Cancelar
            </button>
          )}
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
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-gray-500">
                    Nenhum lançamento ainda
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <Fragment key={`${group.year}-${group.month}`}>
                    <tr className="bg-gray-50 font-semibold">
                      <td className={cellClass}>{MONTHS[group.month]}</td>
                      <td className={cellClass}>{group.year}</td>
                      <td className={`${cellClass} text-right`}>
                        {formatBRL(group.cents)}
                      </td>
                      <td className={cellClass}></td>
                    </tr>
                    {group.entries.map((entry) => (
                      <tr
                        key={entry.key}
                        className={`text-gray-600 ${
                          entry.key === editingKey ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className={`${cellClass} pl-6`} colSpan={2}>
                          {entry.market === 'external' ? 'Externo' : ''}
                        </td>
                        <td className={`${cellClass} text-right`}>
                          {formatBRL(entry.cents)}
                        </td>
                        <td className={`${cellClass} text-right`}>
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              className="leading-none text-blue-700 hover:text-blue-900"
                              onClick={() => handleEdit(entry)}
                              aria-label="Editar"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="text-xl leading-none text-red-700 hover:text-red-900"
                              onClick={() => handleRemove(entry.key)}
                              aria-label="Remover"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export default App
