# NET FOR — Portal Agregador de Notícias do Fortaleza EC

> Todas as notícias do Leão em um só lugar — [netfor.club](https://netfor.club)

Monorepo pnpm + Turborepo:

| Pacote             | Descrição                                                            |
| ------------------ | -------------------------------------------------------------------- |
| `apps/web`         | Next.js 16 (App Router, Cache Components, Tailwind v4)               |
| `packages/db`      | Drizzle ORM + Neon (schema, migrations, seed)                        |
| `packages/scraper` | Pipeline de coleta 24/7 (6 fontes, RSS-first) + sync de jogos (ESPN) |

Plano completo em [`PLANO-NETFOR.md`](./PLANO-NETFOR.md).

## Desenvolvimento

```bash
pnpm install
cp .env.example .env        # preencher DATABASE_URL etc.
pnpm db:migrate && pnpm db:seed
pnpm dev                    # web em http://localhost:3000

pnpm --filter @netfor/scraper start    # rodar scraper de notícias
pnpm --filter @netfor/scraper matches  # sync de jogos/classificação
pnpm build && pnpm lint && pnpm typecheck
```

## Deploy (Cloudflare Workers via OpenNext)

1. `cd apps/web && npx wrangler login`
2. Criar recursos e preencher os IDs em `wrangler.jsonc`:
   ```bash
   npx wrangler kv namespace create netfor-inc-cache   # → kv_namespaces.id
   npx wrangler d1 create netfor-tag-cache             # → d1_databases.database_id
   ```
3. Secrets de runtime do Worker:
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put REVALIDATE_SECRET
   ```
4. Deploy manual: `pnpm --filter @netfor/web deploy`
   Preview local: `pnpm --filter @netfor/web preview`

## Secrets do GitHub Actions

Configurar em _Settings → Secrets and variables → Actions_:

| Secret                  | Usado por                | Descrição                                            |
| ----------------------- | ------------------------ | ---------------------------------------------------- |
| `DATABASE_URL`          | scraper, matches, deploy | Connection string do Neon                            |
| `REVALIDATE_SECRET`     | scraper, matches, deploy | Mesmo valor do Worker (`openssl rand -hex 32`)       |
| `REVALIDATE_URL`        | scraper, matches         | `/api/revalidate` da origem **ativa** (ver aviso)     |
| `CLOUDFLARE_API_TOKEN`  | deploy                   | Token com permissão _Workers Scripts:Edit_ (+ KV/D1) |
| `CLOUDFLARE_ACCOUNT_ID` | deploy                   | ID da conta (dashboard → Workers)                    |

> ⚠️ **`REVALIDATE_URL` precisa apontar para uma origem que responde.** O scraper grava
> no Neon normalmente, mas se a revalidação falhar o Worker continua servindo o cache
> antigo e o site "congela" — foi o que aconteceu enquanto o secret apontava para
> `netfor.club` (ainda não registrado). Enquanto o domínio não estiver no ar, use
> `https://netfor.jejesavewords.workers.dev/api/revalidate`; troque para
> `https://netfor.club/api/revalidate` no mesmo momento em que o Custom Domain subir.
> Desde então uma falha de revalidação derruba a run do Actions (exit 1), em vez de
> passar despercebida.

## Checklist de lançamento

- [ ] Registrar `netfor.club` e apontar para o Worker (Cloudflare → Workers → Custom Domains)
- [ ] Atualizar secret `REVALIDATE_URL` para `https://netfor.club/api/revalidate`
- [ ] [Google Search Console](https://search.google.com/search-console): verificar domínio e enviar `sitemap.xml`
- [ ] [Google News Publisher Center](https://publishercenter.google.com): cadastrar o portal + feed RSS (`/noticias/rss`)
- [ ] Analytics: ativar **Cloudflare Web Analytics** (gratuito, sem cookies) no dashboard do domínio
- [ ] [Google AdSense](https://adsense.google.com): submeter o site; após aprovação, criar 2 unidades
      (leaderboard e retângulo 336x280) e preencher `NEXT_PUBLIC_ADSENSE_*` nos secrets/env de build
- [ ] Patrocínio: substituir o placeholder de `sponsor-card.tsx` pelo banner do patrocinador
      (somente casas licenciadas SPA/MF; manter selo +18 e aviso de jogo responsável)

## Workflows

| Workflow      | Gatilho                 | Função                                          |
| ------------- | ----------------------- | ----------------------------------------------- |
| `scraper.yml` | cron `*/20` + manual    | Coleta notícias das 6 fontes e revalida o cache |
| `matches.yml` | 3x/dia + manual         | Sincroniza agenda/placares/classificação (ESPN) |
| `deploy.yml`  | push na `main` + manual | Build OpenNext + deploy no Cloudflare Workers   |
