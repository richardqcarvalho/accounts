// Hook de autenticação via Supabase (login com GitHub).
//
// Expõe a sessão atual, o usuário, e as ações de login/logout. A sessão é
// persistida pelo próprio SDK do Supabase no localStorage; aqui só refletimos
// o estado em React e ouvimos mudanças (login/logout/refresh).

import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

export interface UseAuthReturn {
  status: AuthStatus
  user: User | null
  session: Session | null
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    // Sessão inicial (pode vir do localStorage ou do redirect OAuth).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setStatus(data.session ? 'signed-in' : 'signed-out')
    })

    // Reage a mudanças: login, logout, refresh de token.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setStatus(next ? 'signed-in' : 'signed-out')
      // Após o redirect do OAuth, o Supabase já processou o code/token na URL.
      // Limpamos os parâmetros (query e hash) pra não deixar lixo visível
      // nem reprocessar num reload.
      if (next) cleanAuthParamsFromUrl()
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signInWithGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        // Volta pra própria página após autorizar.
        redirectTo: window.location.origin + window.location.pathname,
      },
    })
    if (error) throw new Error(`Login falhou: ${error.message}`)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(`Logout falhou: ${error.message}`)
  }

  return {
    status,
    user: session?.user ?? null,
    session,
    signInWithGitHub,
    signOut,
  }
}

// Remove os parâmetros de OAuth (?code=..., &state=..., #access_token=...) da
// URL sem recarregar a página, mantendo o path/base intactos.
function cleanAuthParamsFromUrl() {
  const url = new URL(window.location.href)
  const hadParams =
    url.searchParams.has('code') ||
    url.searchParams.has('state') ||
    url.searchParams.has('error') ||
    url.hash.includes('access_token')
  if (!hadParams) return
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  url.hash = ''
  window.history.replaceState({}, '', url.pathname + url.search)
}
