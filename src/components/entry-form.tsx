import { useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
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
import type { Entity, Entry, EntryKind, Recurrence, TaxComponent } from '@/types'

// Linha do detalhamento no formulário; `cents`/`months` ficam como string durante
// a edição. `months` vazio = sem quantidade de meses definida.
interface ComponentDraft {
  label: string
  cents: string
  months: string
}

const emptyComponent = (): ComponentDraft => ({ label: '', cents: '', months: '' })

interface EntryFormProps {
  entity: Entity
  editing: Entry | null
  // Mês/ano em foco: um novo lançamento já abre no mês que está sendo visto.
  defaultMonth?: number
  defaultYear?: number
  // Ocorrência sendo editada (mês específico de uma série): pré-preenche o mês e
  // os valores daquele mês. `lockPeriod` trava o período e esconde recorrência/
  // detalhamento (estrutura da série é fixa ao editar um mês).
  occurrence?: { calIndex: number; cents: number; items: TaxComponent[] }
  lockPeriod?: boolean
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
  occurrence,
  lockPeriod = false,
  onSubmit,
  onCancel,
}: EntryFormProps) {
  const isPersonal = entity === 'pf'
  // Estado derivado de `editing` já na montagem — o App remonta o form por `key`
  // a cada abertura, então os valores vêm certos no 1º render (sem sincronizar
  // via efeito, o que deixava o mês em branco no Select).
  const [valueCents, setValueCents] = useState(
    occurrence ? String(occurrence.cents) : editing ? String(editing.cents) : '',
  )
  const [month, setMonth] = useState(
    occurrence
      ? String(occurrence.calIndex % 12)
      : editing
        ? String(editing.month)
        : defaultMonth != null
          ? String(defaultMonth)
          : currentMonth,
  )
  const [year, setYear] = useState(
    occurrence
      ? String(Math.floor(occurrence.calIndex / 12))
      : editing
        ? String(editing.year)
        : defaultYear != null
          ? String(defaultYear)
          : String(currentYear),
  )
  const [isExternal, setIsExternal] = useState(
    editing?.kind === 'revenue' ? editing.market === 'external' : false,
  )
  const [kind, setKind] = useState<EntryKind>(
    editing ? editing.kind : isPersonal ? 'tax' : 'revenue',
  )
  const [description, setDescription] = useState(
    editing && editing.kind === 'tax' ? editing.description : '',
  )
  const [recurring, setRecurring] = useState(
    editing?.kind === 'tax' && editing.recurrence != null,
  )
  const [recurringMonths, setRecurringMonths] = useState(
    editing?.kind === 'tax' && editing.recurrence?.months != null
      ? String(editing.recurrence.months)
      : '',
  ) // vazio = sem fim
  const [detailed, setDetailed] = useState(
    occurrence
      ? occurrence.items.length > 0
      : editing?.kind === 'tax' && (editing.items?.length ?? 0) > 0,
  ) // desconto composto por vários valores
  const [components, setComponents] = useState<ComponentDraft[]>(() => {
    const src = occurrence
      ? occurrence.items
      : editing?.kind === 'tax'
        ? editing.items
        : undefined
    return src && src.length > 0
      ? src.map((it) => ({
          label: it.label,
          cents: String(it.cents),
          months: it.months != null ? String(it.months) : '',
        }))
      : [emptyComponent()]
  })

  const isTax = kind === 'tax'
  const detailing = isTax && detailed
  // Total do desconto: soma dos itens quando detalhado, senão o valor único.
  const componentCents = components.map((c) => Number(c.cents) || 0)
  const componentsTotal = componentCents.reduce((sum, c) => sum + c, 0)
  const totalCents = detailing ? componentsTotal : Number(valueCents)

  function updateComponent(index: number, patch: Partial<ComponentDraft>) {
    setComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    )
  }
  function addComponent() {
    setComponents((prev) => [...prev, emptyComponent()])
  }
  function removeComponent(index: number) {
    setComponents((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    )
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (totalCents <= 0 || month === '' || year === '') return

    // Desconto detalhado: guarda os itens com valor (e quantidade de meses, se
    // houver); o total vira a soma deles.
    const items: TaxComponent[] | undefined = detailing
      ? components
          .map((c) => {
            const item: TaxComponent = { label: c.label.trim(), cents: Number(c.cents) || 0 }
            const months = parseInt(c.months, 10)
            if (Number.isInteger(months) && months > 0) item.months = months
            return item
          })
          .filter((c) => c.cents > 0)
      : undefined

    const effectiveKind: EntryKind = isPersonal ? 'tax' : kind
    const base = {
      key: editing?.key ?? crypto.randomUUID(),
      cents: totalCents,
      month: Number(month),
      year: Number(year),
      entity,
    }
    // Cobrança mensal (só PF): sem número = sem fim; com número = tantos meses.
    const parsedMonths = parseInt(recurringMonths, 10)
    const recurrence: Recurrence | undefined =
      isPersonal && recurring && !lockPeriod
        ? { months: Number.isInteger(parsedMonths) && parsedMonths > 0 ? parsedMonths : null }
        : undefined
    const entry: Entry =
      effectiveKind === 'tax'
        ? {
            ...base,
            kind: 'tax',
            description: description.trim(),
            ...(recurrence ? { recurrence } : {}),
            ...(items && items.length > 0 ? { items } : {}),
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

      {!detailing && (
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
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Mês</Label>
          <Select value={month} onValueChange={setMonth} disabled={lockPeriod}>
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
          <Select value={year} onValueChange={setYear} disabled={lockPeriod}>
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
      {isTax && (
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
      {isTax && (detailing || !lockPeriod) && (
        <div className="grid gap-3">
          {!lockPeriod && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="detalhar-valores"
                checked={detailed}
                onCheckedChange={(v) => setDetailed(v === true)}
              />
              <Label htmlFor="detalhar-valores">Detalhar em vários valores</Label>
            </div>
          )}
          {detailing && (
            <div className="grid gap-2">
              {components.map((component, index) => (
                <div key={index} className="grid gap-2 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Descrição"
                      value={component.label}
                      onChange={(e) =>
                        updateComponent(index, { label: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground"
                      aria-label="Remover valor"
                      disabled={components.length === 1}
                      onClick={() => removeComponent(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      className={isPersonal ? 'w-32' : 'flex-1'}
                      value={component.cents ? formatBRL(Number(component.cents)) : ''}
                      onChange={(e) =>
                        updateComponent(index, {
                          cents: e.target.value.replace(/\D/g, ''),
                        })
                      }
                    />
                    {isPersonal && (
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="flex-1"
                        placeholder="Meses (opcional)"
                        aria-label="Quantidade de meses"
                        value={component.months}
                        onChange={(e) =>
                          updateComponent(index, { months: e.target.value })
                        }
                      />
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addComponent}
                >
                  Adicionar valor
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Total: {formatBRL(componentsTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      {isPersonal && !lockPeriod && (
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
                type="number"
                min={1}
                step={1}
                placeholder="Em branco = repete sem fim"
                value={recurringMonths}
                onChange={(e) => setRecurringMonths(e.target.value)}
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
