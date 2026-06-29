import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
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
import type { Entry, EntryKind } from '@/types'

interface EntryFormProps {
  editing: Entry | null
  onSubmit: (entry: Entry) => void
  onCancel: () => void
}

// Formulário de lançamento (usado dentro do modal). Quando `editing` é uma
// entry, carrega seus dados e vira modo de edição.
export function EntryForm({ editing, onSubmit, onCancel }: EntryFormProps) {
  const [valueCents, setValueCents] = useState('')
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(String(currentYear))
  const [isExternal, setIsExternal] = useState(false)
  const [kind, setKind] = useState<EntryKind>('revenue')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!editing) return
    setValueCents(String(editing.cents))
    setMonth(String(editing.month))
    setYear(String(editing.year))
    setKind(editing.kind)
    if (editing.kind === 'tax') {
      setDescription(editing.description)
      setIsExternal(false)
    } else if (editing.kind === 'revenue') {
      setIsExternal(editing.market === 'external')
      setDescription('')
    } else {
      setIsExternal(false)
      setDescription('')
    }
  }, [editing])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (Number(valueCents) <= 0 || month === '' || year === '') return

    const base = {
      key: editing?.key ?? crypto.randomUUID(),
      cents: Number(valueCents),
      month: Number(month),
      year: Number(year),
    }
    const entry: Entry =
      kind === 'tax'
        ? { ...base, kind: 'tax', description: description.trim() }
        : kind === 'prolabore'
          ? { ...base, kind: 'prolabore' }
          : { ...base, kind: 'revenue', market: isExternal ? 'external' : 'internal' }

    onSubmit(entry)
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-1.5">
        <Label>Tipo</Label>
        <Select value={kind} onValueChange={(value) => setKind(value as EntryKind)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Entrada</SelectItem>
            <SelectItem value="prolabore">Pró-labore</SelectItem>
            <SelectItem value="tax">Desconto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label>Valor</Label>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="R$ 0,00"
          value={valueCents ? formatBRL(Number(valueCents)) : ''}
          onChange={(e) => setValueCents(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
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

        <div className="grid gap-1.5">
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
      </div>

      {kind === 'revenue' && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="mercado-externo"
            checked={isExternal}
            onCheckedChange={(v) => setIsExternal(v === true)}
          />
          <Label htmlFor="mercado-externo">Mercado externo</Label>
        </div>
      )}
      {kind === 'tax' && (
        <div className="grid gap-1.5">
          <Label>Descrição</Label>
          <Input
            type="text"
            placeholder="Ex: DARF complementar"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{editing ? 'Salvar' : 'Adicionar'}</Button>
      </div>
    </form>
  )
}
