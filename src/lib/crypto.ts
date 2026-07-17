// Criptografia cliente — PBKDF2-SHA256 + AES-GCM-256.
// Usa apenas Web Crypto API (nativa nos browsers modernos). Sem libs extras.
//
// A senha do usuário nunca é persistida: fica viva só durante a sessão (ou até
// o reload). Tudo que vai pro GitHub (Gist) é a cifra — inútil sem a senha.

const ITERATIONS = 600_000 // PBKDF2 — ~200 ms em laptop, inviabiliza brute force
const KEY_LEN = 256
const NONCE_LEN = 12

// UTF-8 encoder/decoder — TextEncoder é nativa.
const enc = new TextEncoder()
const dec = new TextDecoder()

// Workaround pro tipo `Uint8Array<ArrayBufferLike>` do TS 5.7+, que o tipo
// `BufferSource` da Web Crypto API não aceita na tipagem atual. Como todas
// as arrays aqui são criadas fresh (sem offset), .buffer é sempre ArrayBuffer.
function ab(u: Uint8Array): ArrayBuffer {
  return u.buffer as ArrayBuffer
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface SecretPayload {
  v: 1
  salt: string // base64
  nonce: string // base64
  ct: string // base64
}

// Deriva uma chave AES-GCM-256 a partir de senha + salt.
// `iterations` é configurável só pra teste; produção usa ITERATIONS.
export async function deriveKey(
  password: string,
  saltBytes: Uint8Array,
  iterations = ITERATIONS,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: ab(saltBytes), iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: KEY_LEN },
    true,
    ['encrypt', 'decrypt'],
  )
}

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n))
}

// Retorna um "fingerprint" visual do ciphertext — usado para o usuário
// confirmar que digitou a senha correta (sem revelar nada do conteúdo).
export function fingerprint(payload: SecretPayload): string {
  try {
    const ct = fromBase64(payload.ct)
    // Primeiros 4 bytes do ciphertext, em hex. Único p/ aquele ciphertext.
    return toHex(ct.slice(0, 4)).toUpperCase()
  } catch {
    return ''
  }
}

export async function encrypt(
  plaintext: string,
  password: string,
): Promise<SecretPayload> {
  const salt = randomBytes(16)
  const nonce = randomBytes(NONCE_LEN)
  const key = await deriveKey(password, salt)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ab(nonce) },
      key,
      ab(enc.encode(plaintext)),
    ),
  )
  return {
    v: 1,
    salt: toBase64(salt),
    nonce: toBase64(nonce),
    ct: toBase64(ct),
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super('senha incorreta ou conteúdo corrompido')
    this.name = 'WrongPasswordError'
  }
}

export async function decrypt(
  payload: SecretPayload,
  password: string,
): Promise<string> {
  const salt = fromBase64(payload.salt)
  const nonce = fromBase64(payload.nonce)
  const ct = fromBase64(payload.ct)
  const key = await deriveKey(password, salt)
  try {
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ab(nonce) },
      key,
      ab(ct),
    )
    return dec.decode(pt)
  } catch {
    throw new WrongPasswordError()
  }
}
