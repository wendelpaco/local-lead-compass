# Deploy — Radar Local

## Pré-requisitos

- Projeto Supabase criado (com PostGIS disponível).
- Projeto Google Cloud com billing e APIs ativas (ver GOOGLE_PLACES_SETUP.md).
- Supabase CLI autenticada.

## Passos

### 1. Banco

```bash
supabase link --project-ref <ref>
supabase db push          # aplica supabase/migrations/
```

### 2. Secrets das Edge Functions

```bash
supabase secrets set \
  GOOGLE_MAPS_SERVER_KEY=<server-key> \
  APP_URL=https://app.seudominio.com \
  APP_ENV=production
# SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY são injetadas
# automaticamente pelo Supabase nas functions.
```

### 3. Edge Functions

```bash
supabase functions deploy create-search execute-search geocode-location \
  get-search-status cancel-search import-search-results \
  refresh-place-details calculate-lead-score create-export delete-account-data
```

### 4. Frontend

`.env` de produção:

```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon>
VITE_GOOGLE_MAPS_BROWSER_KEY=<browser-key>
VITE_DATA_MODE=real
```

```bash
bun run build
# deploy do output (Vite/TanStack Start) na hospedagem escolhida
```

## Checklist de produção

- [ ] `VITE_DATA_MODE=real` (nunca demo).
- [ ] Chave browser restrita ao domínio de produção.
- [ ] Chave server restrita às APIs necessárias.
- [ ] RLS testada (usuário A não vê dados da org B).
- [ ] E-mails de auth configurados (confirmação, reset) com domínio próprio.
- [ ] Redirect URLs do Supabase Auth incluem `https://app.../redefinir-senha`.
- [ ] Alertas de billing no Google Cloud (orçamento + limite).
- [ ] Limites de quota por plano revisados em `organizations`.
- [ ] Cron para retomar buscas `queued` órfãs (Supabase cron → execute-search).
- [ ] Limpeza periódica de `idempotency_keys` e `geocode_cache` expirados.
