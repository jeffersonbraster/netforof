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

/**
 * Identidade da publicação para o Google News.
 *
 * O `NewsMediaOrganization` é o que a esteira de notícias lê para saber quem
 * publica, como falar com a redação e onde ficam as regras editoriais. Sem ele
 * o portal aparece como site genérico.
 */
export const newsOrganizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icon-512.png`,
    width: 512,
    height: 512,
  },
  description:
    "Portal independente de notícias sobre o Fortaleza Esporte Clube, com conteúdo editorial próprio.",
  foundingDate: "2026",
  email: "contato@netfor.com.br",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "editorial",
    email: "contato@netfor.com.br",
    availableLanguage: "pt-BR",
  },
  // Exigido de fato na avaliação editorial do Google News.
  ethicsPolicy: `${SITE_URL}/termos`,
  correctionsPolicy: `${SITE_URL}/termos`,
  publishingPrinciples: `${SITE_URL}/sobre`,
  sameAs: ["https://www.instagram.com/netfor.club"],
};

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
