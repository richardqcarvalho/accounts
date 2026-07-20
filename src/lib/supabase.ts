// Cliente Supabase — usado pra auth (login GitHub) e persistência dos dados.
//
// A `anon key` é pública por design: toda a segurança vem das políticas de
// Row-Level Security (RLS) no banco, que garantem que cada usuário só acessa
// as próprias linhas (auth.uid() = user_id).

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar no .env',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Persiste a sessão no localStorage e faz refresh do token sozinho.
    persistSession: true,
    autoRefreshToken: true,
    // Detecta o redirect de volta do OAuth (código na URL).
    detectSessionInUrl: true,
  },
})
