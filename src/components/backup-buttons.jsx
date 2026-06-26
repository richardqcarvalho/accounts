import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadEntries, parseEntriesFile } from '@/lib/backup'

export function BackupButtons({ entries, onImport }) {
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reimportar o mesmo arquivo
    if (!file) return
    try {
      const list = parseEntriesFile(await file.text())
      onImport(list)
      toast.success(`${list.length} lançamento(s) importado(s).`)
    } catch (err) {
      toast.error(`Não foi possível importar o arquivo: ${err.message}`)
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
