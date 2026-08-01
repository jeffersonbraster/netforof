import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function RssIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
      <path d="M4 4.5A15.5 15.5 0 0 1 19.5 20h-3A12.5 12.5 0 0 0 4 7.5zm0 6A9.5 9.5 0 0 1 13.5 20h-3A6.5 6.5 0 0 0 4 13.5zm2 5.5a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
    </svg>
  );
}

/**
 * Desenhado em traço, herdando `currentColor` como os outros ícones do rodapé.
 * A versão anterior usava as cores da marca do Google e era o único colorido da
 * fileira — chamava mais atenção que o próprio conteúdo.
 */
function GoogleNewsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <path d="M4 6.5h11a1.5 1.5 0 0 1 1.5 1.5v10H5.5A1.5 1.5 0 0 1 4 16.5z" />
      <path d="M16.5 10H19a1 1 0 0 1 1 1v6a1.5 1.5 0 0 1-3 0" />
      <path d="M7 10h5M7 13h5M7 16h3" />
    </svg>
  );
}

const socials = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/netfor.club",
    icon: <InstagramIcon />,
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/netforclub",
    icon: <XIcon />,
  },
  {
    label: "Feed RSS",
    href: "/noticias/rss",
    icon: <RssIcon />,
  },
  {
    label: "Google News",
    href: "https://news.google.com",
    icon: <GoogleNewsIcon />,
  },
];

const secoes = [
  { href: "/noticias", label: "Notícias" },
  { href: "/agenda", label: "Agenda" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/videos", label: "Vídeos" },
  { href: "/cantos-da-torcida", label: "Cantos da Torcida" },
  { href: "/noticias/rss", label: "RSS" },
];

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

/**
 * Ft5 · Statement.
 *
 * O rodapé anterior era Ft3 — quatro colunas de links + fileira de social +
 * copyright miúdo. É a segunda assinatura de IA mais reconhecível, e ninguém
 * navega por ali: o trilho do masthead já cobre as seções.
 *
 * Aqui uma frase display fecha a página e os links viram uma linha só.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t-[3px] border-primary bg-surface">
      <div className="relative mx-auto max-w-6xl overflow-hidden px-4 py-14">
        {/* Leão como marca d'água: presença da identidade sem competir com a
            frase. Fica atrás do texto, recortado pela borda direita. */}
        <Image
          src="/lion-not-found.png"
          alt=""
          width={320}
          height={320}
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 h-full w-auto max-w-[45%] object-contain object-right-bottom opacity-[0.07] select-none dark:opacity-[0.12]"
        />
        <p className="font-display relative max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight uppercase sm:text-6xl">
          Todas as notícias do <span className="text-primary-text">Leão</span> em um só lugar.
        </p>

        {/* Links internos no rodapé importam para SEO: dão ao rastreador um
            caminho para toda seção a partir de qualquer página, e distribuem
            autoridade interna. O Ft5 admite links — o que ele rejeita é o
            paredão de quatro colunas do padrão anterior. */}
        <nav aria-label="Mapa do site" className="mt-10 border-t border-line pt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 font-display text-sm font-bold tracking-wide uppercase">
            {secoes.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="text-muted transition-colors hover:text-primary-text"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <div>
            <Image
              src="/netfor.svg"
              alt="NETFOR"
              width={120}
              height={33}
              className="hidden dark:block"
            />
            <Image
              src="/netfor-blue.svg"
              alt="NETFOR"
              width={120}
              height={33}
              className="dark:hidden"
            />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Sugestões, dicas ou correções:{" "}
              <a
                href="mailto:contato@netfor.com.br"
                className="text-link underline underline-offset-4 hover:text-foreground"
              >
                contato@netfor.com.br
              </a>
            </p>
          </div>

          <ul className="flex items-center gap-3">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="flex size-10 items-center justify-center border border-line text-muted transition-colors hover:border-primary hover:text-foreground"
                >
                  {social.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-xs text-muted">
          <p>
            © <CopyrightYear /> NETFOR · Portal independente, sem vínculo oficial com o Fortaleza EC
          </p>
          <p className="flex gap-4">
            <Link href="/sobre" className="transition-colors hover:text-foreground">
              Sobre
            </Link>
            <Link href="/privacidade" className="transition-colors hover:text-foreground">
              Privacidade
            </Link>
            <Link href="/termos" className="transition-colors hover:text-foreground">
              Termos
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
