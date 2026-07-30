import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";

import Script from "next/script";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ADSENSE_CLIENT } from "@/lib/ads";
import { JsonLd, webSiteJsonLd } from "@/lib/seo";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://netfor.club"),
  title: {
    default: "NET FOR — Todas as notícias do Leão em um só lugar",
    template: "%s | NET FOR",
  },
  description:
    "Portal agregador de notícias do Fortaleza Esporte Clube: últimas notícias, agenda de jogos, classificação, cantos da torcida e vídeos — atualizado 24/7.",
  manifest: "/manifest.json",
  alternates: {
    types: { "application/rss+xml": "/noticias/rss" },
  },
  openGraph: {
    type: "website",
    siteName: "NET FOR",
    locale: "pt_BR",
    url: "https://netfor.club",
    images: [{ url: "/netfor-banner.jpeg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("netfor-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <JsonLd data={webSiteJsonLd} />
        <Header />
        <main className="flex-1">{children}</main>
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
