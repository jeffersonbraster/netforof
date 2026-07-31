import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin"],
      },
    ],
    // O news-sitemap fica de fora enquanto vigora o Modo A: as páginas de matéria
    // são noindex, então anunciá-lo só gasta rastreamento e enche o relatório de
    // cobertura do Search Console de "excluída por noindex". Reincluir no Modo B.
    sitemap: [`${SITE_URL}/sitemap.xml`],
  };
}
