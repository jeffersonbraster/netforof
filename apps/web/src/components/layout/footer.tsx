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

function GoogleNewsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M13.5 5 20.5 7.7V16l-7-2.7z" />
      <path fill="#FBBC04" d="M10.5 5 3.5 7.7V16l7-2.7z" />
      <rect x="4" y="8.5" width="16" height="11" rx="2" fill="#4285F4" />
      <path fill="#fff" d="M7 12h7v1.5H7zm0 3h10v1.5H7z" />
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
      <div className="mx-auto max-w-6xl px-4 py-14">
        <p className="font-display max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight uppercase sm:text-6xl">
          Todas as notícias do <span className="text-primary-text">Leão</span> em um só lugar.
        </p>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
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
