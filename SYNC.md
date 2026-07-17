# Sincronização criptografada via GitHub Gist

## Visão geral

Os lançamentos são cifrados no browser e armazenados num Gist público do GitHub.  
A cifra é pública, mas inútil sem sua senha (AES-GCM-256 + PBKDF2-SHA256).

## Fluxo

### Primeiro uso (criar)

1. Clique no botão **"Offline"** (canto superior direito)
2. Escolha **"Criar um novo Gist cifrado"**
3. Defina e confirme a senha (mínimo 8 caracteres)
4. O app cria o Gist e envia seus dados locais na mesma write
5. **Guarde a URL do Gist e a senha** — não dá pra recuperar

### Acesso de outra máquina (conectar)

1. Clique em **"Offline"** → **"Conectar a um Gist existente"**
2. Insira o ID do Gist (ou URL completa) e a senha
3. Os dados locais são **substituídos** pelos da nuvem (não mescla)

### Recarregar / atualizar

- Com o Gist conectado, clique em **"Nuvem"** → **"Recarregar da nuvem"**
- A cada mudança local, o app sincroniza automaticamente (debounce de 2 s)

### Desconectar

- Clique em **"Nuvem"** → **"Desconectar"**
- Os dados locais permanecem; só o link com o Gist é removido

## Segurança

| Dado | Onde fica | Sensibilidade |
|---|---|---|
| Cifra (Gist) | GitHub público | Baixa (sem senha = ruído) |
| `gistId` + URL | `localStorage` | Baixa (público) |
| Senha | Memória da sessão | Alta (não persiste) |
| Entries | IndexedDB local | Média (cache offline) |

### Criptografia

- **PBKDF2-SHA256** com 600.000 iterações — gera chave da senha
- **AES-GCM-256** — cifra autenticada, padrão da indústria
- Salt + nonce aleatórios por write — cada cifra é única mesmo pra dados idênticos

### Riscos

- **Senha fraca** → brute force offline possível (PBKDF2 encarece, mas não impede)
- **Perder senha** → perde tudo (sem recuperação)
- **Gist deletado** → perde tudo (mantenha backup JSON via Export)

## Backup manual

Os botões **Exportar** / **Importar** continuam disponíveis pra backup JSON local, independente do Gist.  
Use-os periodicamente como cópia de segurança extra.

## Arquitetura

```
Browser ←→ IndexedDB (cache) ←→ Gist API (GitHub)
    │                              │
    ├── crypto.ts (AES-GCM)        └── sync.ts (createGist/loadGist/saveGist)
    ├── use-entries.ts (state)
    └── use-sync.ts (orquestração)
```

Cifra no browser → Gist público → cifra no browser de outra máquina → senha desfaz cifra → IndexedDB local.
