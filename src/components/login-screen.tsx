// Tela de login — mostrada quando não há sessão ativa. Bloqueia o acesso ao
// app até o usuário autenticar com o GitHub via Supabase.

import { Cloud, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LoginScreenProps {
  onLogin: () => void
  loading?: boolean
  error?: string | null
}

export function LoginScreen({ onLogin, loading, error }: LoginScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Lançamentos</h1>
          <p className="text-sm text-muted-foreground">
            Entre com sua conta do GitHub para acessar e sincronizar seus
            lançamentos em qualquer dispositivo.
          </p>
        </div>

        <Button className="w-full" onClick={onLogin} disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Cloud className="size-4" />
          )}
          Entrar com GitHub
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-xs text-muted-foreground">
          Seus dados ficam protegidos por Row-Level Security — só você tem
          acesso a eles.
        </p>
      </div>
    </div>
  )
}
