export const SITE_URL = "https://netfor.com.br";
export const SITE_NAME = "NETFOR";

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
    "Portal agregador de notícias do Fortaleza Esporte Clube: notícias, agenda de jogos, classificação, cantos da torcida e vídeos.",
  inLanguage: "pt-BR",
};
