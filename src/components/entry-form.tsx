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
import type { Entity, Entry, EntryKind, Recurrence } from '@/types'

interface EntryFormProps {
  entity: Entity
  editing: Entry | null
  // Mês/ano em foco: um novo lançamento já abre no mês que está sendo visto.
  defaultMonth?: number
  defaultYear?: number
  onSubmit: (entry: Entry) => void
  onCancel: () => void
}

// Formulário de lançamento (usado dentro do modal). Quando `editing` é uma
// entry, carrega seus dados e vira modo de edição. Na pessoa física só há
// descontos (a entrada é o líquido da PJ), então o seletor de tipo some.
export function EntryForm({
  entity,
  editing,
  defaultMonth,
  defaultYear,
  onSubmit,
  onCancel,
}: EntryFormProps) {
  const isPersonal = entity === 'pf'
  const [valueCents, setValueCents] = useState('')
  const [month, setMonth] = useState(
    defaultMonth != null ? String(defaultMonth) : currentMonth,
  )
  const [year, setYear] = useState(
    defaultYear != null ? String(defaultYear) : String(currentYear),
  )
  const [isExternal, setIsExternal] = useState(false)
  const [kind, setKind] = useState<EntryKind>(isPersonal ? 'tax' : 'revenue')
  const [description, setDescription] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [recurringMonths, setRecurringMonths] = useState('') // vazio = sem fim

  useEffect(() => {
    if (!editing) return
    setValueCents(String(editing.cents))
    setMonth(String(editing.month))
    setYear(String(editing.year))
    setKind(editing.kind)
    if (editing.kind === 'tax') {
      setDescription(editing.description)
      setIsExternal(false)
      setRecurring(editing.recurrence != null)
      setRecurringMonths(
        editing.recurrence?.months != null ? String(editing.recurrence.months) : '',
      )
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

    const effectiveKind: EntryKind = isPersonal ? 'tax' : kind
    const base = {
      key: editing?.key ?? crypto.randomUUID(),
      cents: Number(valueCents),
      month: Number(month),
      year: Number(year),
      entity,
    }
    // Cobrança mensal (só PF): sem número = sem fim; com número = tantos meses.
    const parsedMonths = parseInt(recurringMonths, 10)
    const recurrence: Recurrence | undefined =
      isPersonal && recurring
        ? { months: Number.isInteger(parsedMonths) && parsedMonths > 0 ? parsedMonths : null }
        : undefined
    const entry: Entry =
      effectiveKind === 'tax'
        ? {
            ...base,
            kind: 'tax',
            description: description.trim(),
            ...(recurrence ? { recurrence } : {}),
          }
        : effectiveKind === 'prolabore'
          ? { ...base, kind: 'prolabore' }
          : { ...base, kind: 'revenue', market: isExternal ? 'external' : 'internal' }

    onSubmit(entry)
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {!isPersonal && (
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
      )}

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
      {isPersonal && (
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="cobranca-mensal"
              checked={recurring}
              onCheckedChange={(v) => setRecurring(v === true)}
            />
            <Label htmlFor="cobranca-mensal">Cobrança mensal</Label>
          </div>
          {recurring && (
            <div className="grid gap-1.5">
              <Label htmlFor="qtd-meses">Quantidade de meses</Label>
              <Input
                id="qtd-meses"
                type="text"
                inputMode="numeric"
                placeholder="Em branco = repete sem fim"
                value={recurringMonths}
                onChange={(e) =>
                  setRecurringMonths(e.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          )}
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
