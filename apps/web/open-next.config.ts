import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// KV = cache incremental ("use cache"/ISR); D1 = tags p/ revalidateTag;
// DO queue = fila de revalidação. Ver bindings em wrangler.jsonc.
export default defineCloudflareConfig({
  /**
   * Cache regional (Cache API do data center) na frente do KV.
   *
   * O que aperta primeiro no plano de $5 não é requisição — 10M/mês é muito mais
   * do que o portal vai ver tão cedo. É LEITURA DE KV: são vários GETs por
   * requisição de página contra 10M/mês incluídos. Com a Cache API na frente,
   * requisição repetida no mesmo data center não toca no KV.
   *
   * Modo `short-lived` (reaproveita por até 1 minuto), NÃO `long-lived`: o
   * long-lived segura entrada de ISR por até 30 minutos, e a regra do portal é
   * home atualizada assim que entra matéria nova. Um minuto de atraso é
   * invisível para o leitor; trinta não são.
   *
   * O `long-lived` só seria seguro junto com purga automática (`cachePurge`),
   * que exige token da Cloudflare com permissão de purge — não temos, e não vale
   * a troca por 1 minuto de frescor.
   *
   * `enableCacheInterception` ficou de fora de propósito: a documentação do
   * próprio adapter diz que deve ser `false` quando PPR está em uso, e este
   * projeto roda Cache Components + PPR.
   */
  incrementalCache: withRegionalCache(kvIncrementalCache, { mode: "short-lived" }),
  tagCache: d1NextTagCache,
  queue: doQueue,
});
