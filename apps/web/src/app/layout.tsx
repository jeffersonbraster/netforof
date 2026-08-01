import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";

import Script from "next/script";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ADSENSE_CLIENT } from "@/lib/ads";
import { GOOGLE_SITE_VERIFICATION, JsonLd, SITE_NAME, SITE_URL, webSiteJsonLd } from "@/lib/seo";
import { getProximoJogo } from "@/modules/matches/queries";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Todas as notícias do Leão em um só lugar`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Notícias do Fortaleza Esporte Clube com texto próprio e fonte creditada: últimas notícias, agenda de jogos, classificação, cantos da torcida e vídeos.",
  manifest: "/manifest.json",
  ...(GOOGLE_SITE_VERIFICATION && { verification: { google: GOOGLE_SITE_VERIFICATION } }),
  alternates: {
    types: { "application/rss+xml": "/noticias/rss" },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "pt_BR",
    url: SITE_URL,
    images: [{ url: "/netfor-banner.jpeg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("netfor-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const proximoJogo = await getProximoJogo();

  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <JsonLd data={webSiteJsonLd} />
        {/* WCAG 2.4.1: sem isto, quem navega por teclado atravessa o header fixo
            e as duas navs a cada página antes de chegar ao conteúdo. */}
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-link"
        >
          Pular para o conteúdo
        </a>
        <Header proximoJogo={proximoJogo} />
        <main id="conteudo" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <Footer />
        {/* Anúncios carregam lazy (pós-load) — não competem com o LCP */}
        {ADSENSE_CLIENT && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
