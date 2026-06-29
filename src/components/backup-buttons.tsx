import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadEntries, parseEntriesFile } from '@/lib/backup'
import type { Entry } from '@/types'

interface BackupButtonsProps {
  entries: Entry[]
  onImport: (list: Entry[]) => void
}

export function BackupButtons({ entries, onImport }: BackupButtonsProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reimportar o mesmo arquivo
    if (!file) return
    try {
      const list = parseEntriesFile(await file.text())
      onImport(list)
      toast.success(`${list.length} lançamento(s) importado(s).`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(`Não foi possível importar o arquivo: ${message}`)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          downloadEntries(entries)
          toast.success('Lançamentos exportados.')
        }}
        disabled={entries.length === 0}
      >
        <Download className="size-4" />
        Exportar
      </Button>
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" />
        Importar
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
      />
    </>
  )
}
