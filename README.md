# NETFOR — Portal Agregador de Notícias do Fortaleza EC

> Todas as notícias do Leão em um só lugar — [netfor.com.br](https://netfor.com.br)

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
4. Deploy manual: `pnpm --filter @netfor/web run deploy`
   (o `run` é obrigatório — sem ele o pnpm executa o próprio comando `deploy`)
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

> ⚠️ **`REVALIDATE_URL` precisa apontar para uma origem que responde** — hoje
> `https://netfor.com.br/api/revalidate`. O scraper grava no Neon normalmente, mas se a
> revalidação falhar o Worker continua servindo o cache antigo e o site "congela": foi o
> que aconteceu em 30/07/2026, quando o secret apontava para um domínio ainda não
> registrado. Uma falha de revalidação agora derruba a run do Actions (exit 1) em vez de
> passar despercebida. Só troque este secret depois de confirmar que o Custom Domain
> responde 200.

## Checklist de lançamento

- [x] Registrar `netfor.com.br` (30/07/2026) e delegar os nameservers do registro.br
      para a Cloudflare — zona ativa em 31/07/2026
- [x] Custom Domain do Worker (`netfor.com.br` + `www`) com certificado emitido
- [x] Email Routing: `contato@netfor.com.br` → Gmail do dono. Atenção: o registro.br
      cria um *null MX* (`MX .`) e `SPF -all` por padrão, que bloqueiam o endereço
      publicado no site; ambos precisam ser removidos antes de habilitar
- [x] Atualizar secret `REVALIDATE_URL` para `https://netfor.com.br/api/revalidate`
- [x] **Bot Fight Mode desligado** (_Security → Bots_, 31/07/2026): ligado, ele devolvia
      Managed Challenge (`403` + `cf-mitigated: challenge` + "Just a moment...") ao IP do
      runner do Actions e quebrava o webhook de revalidação. Não aceita exceção por
      regra de WAF — só desligando. Se o sintoma voltar, é o primeiro lugar a olhar
- [ ] [Google Search Console](https://search.google.com/search-console): verificar domínio e enviar `sitemap.xml`
- [ ] [Google News Publisher Center](https://publishercenter.google.com): cadastrar o portal + feed RSS (`/noticias/rss`)
- [ ] Analytics: ativar **Cloudflare Web Analytics** (gratuito, sem cookies) no dashboard do domínio
- [ ] [Google AdSense](https://adsense.google.com): submeter o site; após aprovação, criar 2 unidades
      (leaderboard e retângulo 336x280) e preencher `NEXT_PUBLIC_ADSENSE_*` nos secrets/env de build
- [ ] Patrocínio: substituir o placeholder de `sponsor-card.tsx` pelo banner do patrocinador
      (somente casas licenciadas SPA/MF; manter selo +18 e aviso de jogo responsável)

## Segurança

Headers vão todos pelo `headers()` do `next.config.ts` — CSP, HSTS (2 anos, preload),
`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`.

- **`script-src` tem `'unsafe-inline'` de propósito**: o Next injeta script de
  hidratação e o boot de tema roda antes do React. Travar exigiria nonce por
  requisição, incompatível com HTML cacheado na borda. O valor da CSP aqui está em
  `frame-ancestors`, `base-uri`, `form-action` e `object-src`.
- **Ao ativar o AdSense**, liberar os domínios do Google em `script-src`/`frame-src`/
  `img-src`, senão o anúncio é bloqueado pela CSP.
- **`/api/views` tem duas camadas**: mesma origem (`Origin` + `Sec-Fetch-Site`) + slug
  no formato esperado, e **rate limit de 20/min por IP**. O rate limit é o binding
  `ratelimits` do Worker (`VIEWS_RATE_LIMITER` no `wrangler.jsonc`), não regra de zona:
  vive no código, sobe no deploy e não gasta a única regra de WAF do plano free.
  O contador da Cloudflare é **aproximado** — sob concorrência deixa a rajada passar do
  teto antes de barrar. Contém abuso sustentado, não é corte exato.
- `postcss` e `sharp` aparecem no `pnpm audit` via Next: são build-time, não rodam no
  Worker. Só somem quando o Next atualizar as transitivas.

## Armadilha: `loading.tsx` e 404

Rota com parâmetro dinâmico que precisa devolver **404 não pode ter `loading.tsx`**.
Ele cria um Suspense implícito no segmento; com PPR o shell sai imediatamente com
status 200 e o `notFound()` acontece depois, no streaming, quando os headers já foram
enviados. O sintoma é *soft 404*: página de "não encontrada" servida com HTTP 200.

Foi o que aconteceu em `/noticias/[slug]` até 31/07/2026. `/cantos-da-torcida/[slug]`
sempre acertou porque nunca teve `loading.tsx`.

## Cota do KV (plano free)

O cache incremental vive no KV, que no plano gratuito dá **1000 escritas/dia** —
estourado em 31/07/2026. O que gasta, por ordem:

- **69 puts por deploy**: `opennextjs-cloudflare deploy` sempre roda `populateCache`
  antes do `wrangler deploy`, sem flag para pular. Deploy que falha depois disso já
  gastou os 69. Com a cota estourada nenhum deploy passa — para subir assim mesmo:
  `npx opennextjs-cloudflare build && OPEN_NEXT_DEPLOY=true npx wrangler deploy`.
- ~~`cacheLife("hours")` em ~30 entradas ≈ 720 puts/dia~~ — **corrigido**: passou para
  `days` onde o `revalidateTag` cobre o frescor. Seguem em `hours` de propósito o
  ticker, a agenda e a home (que embute o ticker), porque separam passado de futuro
  por `now` e envelhecem sozinhos, sem depender do banco.
- A tag `articles` só fica nas listas. Página de matéria carrega `article-<slug>` —
  a matéria é imutável (`onConflictDoNothing`), então notícia nova não precisa
  invalidar o acervo. Cuidado: tag de função aninhada alcança a entrada externa.
- Builds antigos **nunca são limpos** (`incremental-cache/<buildId>/`). Deleção tem
  cota própria e funciona mesmo com escrita bloqueada.

O buildId vivo aparece como `"b":"<id>"` no payload RSC; conferir numa rota
renderizada na hora (ex.: `/noticias?pagina=9`), porque página cacheada carrega o
buildId de quando foi renderizada.

## Workflows

| Workflow      | Gatilho                 | Função                                          |
| ------------- | ----------------------- | ----------------------------------------------- |
| `scraper.yml` | cron `*/20` + manual    | Coleta notícias das 6 fontes e revalida o cache |
| `matches.yml` | 3x/dia + manual         | Sincroniza agenda/placares/classificação (ESPN) |
| `deploy.yml`  | push na `main` + manual | Build OpenNext + deploy no Cloudflare Workers   |
