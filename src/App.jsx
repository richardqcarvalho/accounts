import { useState } from 'react'
import './App.css'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

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
    <main className="container">
      <h1>Lançamentos</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Valor
          <input
            type="text"
            inputMode="numeric"
            placeholder="R$ 0,00"
            value={valueCents ? formatBRL(Number(valueCents)) : ''}
            onChange={handleValueChange}
          />
        </label>

        <label>
          Mês
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Selecione</option>
            {MONTHS.map((name, index) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ano
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">Selecione</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <button type="submit">Adicionar</button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Mês</th>
            <th>Ano</th>
            <th className="value">Valor</th>
            <th aria-label="Ações"></th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="empty">
                Nenhum lançamento ainda
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td>{MONTHS[entry.month]}</td>
                <td>{entry.year}</td>
                <td className="value">{formatBRL(entry.cents)}</td>
                <td className="value">
                  <button
                    type="button"
                    className="remove"
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
            <tr>
              <td colSpan={2}>Total</td>
              <td className="value">{formatBRL(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </main>
  )
}

export default App
