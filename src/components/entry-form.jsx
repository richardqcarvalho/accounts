import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MONTHS, YEARS, currentMonth, currentYear } from '@/lib/calendar'
import { formatBRL } from '@/lib/format'

const fieldClass = 'flex flex-1 basis-32 flex-col gap-1.5'

// Formulário de lançamento. Quando `editing` é uma entry, carrega seus dados e
// vira modo de edição; ao salvar/cancelar volta ao modo de adição.
export function EntryForm({ editing, onSubmit, onCancel }) {
  const [valueCents, setValueCents] = useState('')
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(String(currentYear))
  const [isExternal, setIsExternal] = useState(false)
  const [kind, setKind] = useState('revenue')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!editing) return
    setValueCents(String(editing.cents))
    setMonth(String(editing.month))
    setYear(String(editing.year))
    setKind(editing.kind ?? 'revenue')
    setIsExternal(editing.market === 'external')
    setDescription(editing.description ?? '')
  }, [editing])

  function reset() {
    setValueCents('')
    setMonth(currentMonth)
    setYear(String(currentYear))
    setIsExternal(false)
    setKind('revenue')
    setDescription('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (Number(valueCents) <= 0 || month === '' || year === '') return

    const entry = {
      key: editing?.key ?? crypto.randomUUID(),
      cents: Number(valueCents),
      month: Number(month),
      year: Number(year),
      kind,
    }
    if (kind === 'tax') {
      entry.description = description.trim()
    } else {
      entry.market = isExternal ? 'external' : 'internal'
    }

    onSubmit(entry)

    if (editing) {
      reset()
    } else {
      // Mantém tipo/mês/ano para lançar vários seguidos.
      setValueCents('')
      setIsExternal(false)
      setDescription('')
    }
  }

  function handleCancel() {
    reset()
    onCancel()
  }

  return (
    <Card className="mb-8">
      <CardContent>
        <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
          <div className={fieldClass}>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Faturamento</SelectItem>
                <SelectItem value="tax">Imposto extra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={fieldClass}>
            <Label>Valor</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={valueCents ? formatBRL(Number(valueCents)) : ''}
              onChange={(e) => setValueCents(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div className={fieldClass}>
            <Label>Mês</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, index) => (
                  <SelectItem key={index} value={String(index)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={fieldClass}>
            <Label>Ano</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {kind === 'revenue' ? (
            <div className="flex items-center gap-2 py-2">
              <Checkbox
                id="mercado-externo"
                checked={isExternal}
                onCheckedChange={(v) => setIsExternal(v === true)}
              />
              <Label htmlFor="mercado-externo">Mercado externo</Label>
            </div>
          ) : (
            <div className={fieldClass}>
              <Label>Descrição</Label>
              <Input
                type="text"
                placeholder="Ex: DARF complementar"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          <Button type="submit">{editing ? 'Salvar' : 'Adicionar'}</Button>

          {editing && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
