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

/**
 * `ImageObject` de imagem NOSSA (logo, ícone), com os metadados de direitos.
 *
 * O Search Console abre "O campo license não foi encontrado" em todo
 * `ImageObject` sem procedência declarada. É aviso não crítico — não derruba
 * nada — mas some da lista dizendo o que já é verdade: a marca é nossa e as
 * condições estão nos termos.
 *
 * Só para imagem própria. Foto de matéria vem da fonte original (Modo A) e
 * continua entrando como URL solta no `image` do NewsArticle, sem ImageObject:
 * declarar licença sobre foto de terceiro seria reivindicar direito que não
 * temos — e é exatamente o que o campo afirma.
 */
export function imagemDaMarca(caminho: string, largura: number, altura: number) {
  return {
    "@type": "ImageObject",
    url: `${SITE_URL}${caminho}`,
    contentUrl: `${SITE_URL}${caminho}`,
    width: largura,
    height: altura,
    license: `${SITE_URL}/termos#licenca`,
    acquireLicensePage: `${SITE_URL}/termos#licenca`,
    creditText: SITE_NAME,
    copyrightNotice: `© ${SITE_NAME}`,
    creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
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
  logo: imagemDaMarca("/icon-512.png", 512, 512),
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
