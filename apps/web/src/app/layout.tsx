import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

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
  metadataBase: new URL("https://netfor.com.br"),
  title: {
    default: "NET FOR — Todas as notícias do Leão em um só lugar",
    template: "%s | NET FOR",
  },
  description:
    "Portal agregador de notícias do Fortaleza Esporte Clube: últimas notícias, agenda de jogos, classificação, cantos da torcida e vídeos — atualizado 24/7.",
  manifest: "/manifest.json",
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
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
