/**
 * Bindings do Worker visíveis ao código do Next (via getCloudflareContext).
 * Os de cache (KV, D1, DO) são consumidos pelo adapter, não pelo app — só
 * declaramos aqui o que a aplicação usa diretamente.
 */
declare namespace Cloudflare {
  interface Env {
    /** Rate limit por IP — configurado em wrangler.jsonc. */
    VIEWS_RATE_LIMITER: {
      limit(options: { key: string }): Promise<{ success: boolean }>;
    };
  }
}

interface CloudflareEnv extends Cloudflare.Env {}
