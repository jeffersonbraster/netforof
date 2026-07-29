import Image from "next/image";
import Link from "next/link";

const sections = [
  { href: "/noticias", label: "Notícias" },
  { href: "/agenda", label: "Agenda de jogos" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/cantos-da-torcida", label: "Cantos da torcida" },
  { href: "/videos", label: "Vídeos" },
  { href: "/sobre", label: "Sobre o NET FOR" },
];

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

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-4">
          <Image
            src="/netfor.svg"
            alt="NET FOR"
            width={120}
            height={33}
            className="hidden dark:block"
          />
          <Image
            src="/netfor-blue.svg"
            alt="NET FOR"
            width={120}
            height={33}
            className="dark:hidden"
          />
          <p className="text-sm leading-relaxed text-muted">
            O portal tem como objetivo manter todos os torcedores e amantes do Fortaleza informados
            sobre tudo que acontece no clube, buscando informações nas principais fontes de notícias
            sobre o Maior time do Nordeste e do mundo!!
          </p>
          <p className="text-sm text-muted">
            Para sugestões, dicas ou informações entre em contato pelo e-mail{" "}
            <a
              href="mailto:contato@netfor.club"
              className="text-link hover:underline underline-offset-4"
            >
              contato@netfor.club
            </a>
          </p>
        </div>

        <nav aria-label="Seções">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Seções</h3>
          <ul className="space-y-2 text-sm text-muted">
            {sections.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="transition-colors hover:text-foreground">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">
            Siga o NET FOR
          </h3>
          <ul className="flex items-center gap-3">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="flex size-10 items-center justify-center rounded-lg border border-line bg-surface-2/60 text-muted transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {social.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted sm:text-left">
          <p>© {new Date().getFullYear()} NET FOR</p>
        </div>
      </div>
    </footer>
  );
}
