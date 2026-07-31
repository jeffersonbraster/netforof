export const SITE_URL = "https://netfor.com.br";
export const SITE_NAME = "NETFOR";

/**
 * Código de verificação do Google Search Console (propriedade "prefixo de URL").
 * Não é segredo — a meta tag fica visível no HTML. Vazio = tag não renderiza.
 * Se a propriedade for do tipo "domínio", a verificação é por TXT no DNS e esta
 * env não é usada.
 */
export const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "";

/** Injeta JSON-LD estruturado. Uso: <JsonLd data={{...}} /> */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "NETFOR — Notícias do Fortaleza EC",
  url: SITE_URL,
  description:
    "Notícias do Fortaleza Esporte Clube com texto próprio e fonte creditada: últimas notícias, agenda de jogos, classificação, cantos da torcida e vídeos.",
  inLanguage: "pt-BR",
};
