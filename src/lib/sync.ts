// Sincronização com um Gist público via GitHub API. Sem backend, sem PAT no
// cliente — a autenticação é a senha do usuário (chave para descriptografar).
//
// O formato do Gist é um único arquivo `accounts.json` com:
//   { v: 1, at: ISO, payload: SecretPayload }
// A cifra é pública — sem a senha é só ruído.

import { parseEntriesFile } from '@/lib/backup'
import { decrypt, encrypt, fingerprint, type SecretPayload } from '@/lib/crypto'
import type { Entry } from '@/types'

const API = 'https://api.github.com'
const FILENAME = 'accounts.json'

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

interface GistFile {
  content: string
}

interface Gist {
  id: string
  html_url: string
  edited_at: string
  files: Record<string, GistFile>
}

interface Outer {
  v: 1
  at: string
  payload: SecretPayload
}

// Cria um Gist público com um payload cifrado vazio (lista vazia de entries).
// Retorna id + URL pra ser persistido localmente.
export async function createGist(password: string): Promise<{
  id: string
  url: string
}> {
  const outer: Outer = {
    v: 1,
    at: new Date().toISOString(),
    payload: await encrypt(JSON.stringify([]), password),
  }
  const gist: Gist = await request(`${API}/gists`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      description: 'Contas pessoais — sincronização criptografada',
      public: true,
      files: { [FILENAME]: { content: JSON.stringify(outer) } },
    }),
  })
  return { id: gist.id, url: gist.html_url }
}

export interface LoadedGist {
  entries: Entry[]
  // Fingerprint visual do payload; usado pra confirmar que a senha
  // bate com o Gist esperado (antes mesmo de abrir).
  fingerprint: string
  updatedAt: string
}

// Carrega o Gist e descriptografa a lista de entries. A normalização de
// formato reaproveita `parseEntriesFile` do backup.ts.
export async function loadGist(
  gistId: string,
  password: string,
): Promise<LoadedGist> {
  const gist: Gist = await request(`${API}/gists/${gistId}`, {
    headers: headers(),
  })
  const raw = gist.files[FILENAME]?.content
  if (!raw) throw new Error('Gist sem o arquivo de backup')

  const outer: Outer = JSON.parse(raw)
  if (outer.v !== 1)
    throw new Error(`versão de Gist desconhecida: ${String(outer.v)}`)

  const fp = fingerprint(outer.payload)

  const plaintext = await decrypt(outer.payload, password)
  const entries = parseEntriesFile(plaintext)
  return {
    entries,
    fingerprint: fp,
    updatedAt: gist.edited_at,
  }
}

// Sobrescreve o conteúdo do Gist cifrando a lista atual de entries.
export async function saveGist(
  gistId: string,
  password: string,
  entries: Entry[],
): Promise<void> {
  const outer: Outer = {
    v: 1,
    at: new Date().toISOString(),
    payload: await encrypt(JSON.stringify(entries), password),
  }
  await request(`${API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      files: { [FILENAME]: { content: JSON.stringify(outer) } },
    }),
  })
}
