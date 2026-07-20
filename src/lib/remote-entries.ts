// Camada remota: CRUD de entries no Supabase.
//
// Cada linha é { user_id, key, data (jsonb), updated_at }. O `user_id` é
// preenchido automaticamente pela sessão (RLS garante o isolamento). Guardamos
// a Entry inteira em `data` — assim o schema não precisa acompanhar mudanças
// no formato dos lançamentos.

import { supabase } from '@/lib/supabase'
import type { Entry } from '@/types'

const TABLE = 'entries'

interface Row {
  key: string
  data: Entry
  updated_at: string
}

// Busca todas as entries do usuário logado.
export async function fetchRemoteEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('key, data, updated_at')
  if (error) throw new Error(`Supabase: ${error.message}`)
  return (data as Row[]).map((r) => r.data)
}

// Insere ou atualiza uma entry (upsert por user_id + key).
export async function upsertRemoteEntry(
  userId: string,
  entry: Entry,
): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      key: entry.key,
      data: entry,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,key' },
  )
  if (error) throw new Error(`Supabase: ${error.message}`)
}

// Remove uma entry pela key.
export async function deleteRemoteEntry(key: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('key', key)
  if (error) throw new Error(`Supabase: ${error.message}`)
}

// Substitui todo o conjunto remoto: apaga tudo do usuário e insere a lista.
// Usado no "enviar tudo pra nuvem" (push do estado local completo).
export async function replaceRemoteEntries(
  userId: string,
  entries: Entry[],
): Promise<void> {
  // Apaga tudo do usuário (RLS restringe ao próprio user_id de qualquer forma).
  const { error: delError } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
  if (delError) throw new Error(`Supabase: ${delError.message}`)

  if (entries.length === 0) return

  const rows = entries.map((entry) => ({
    user_id: userId,
    key: entry.key,
    data: entry,
    updated_at: new Date().toISOString(),
  }))
  const { error: insError } = await supabase.from(TABLE).insert(rows)
  if (insError) throw new Error(`Supabase: ${insError.message}`)
}
