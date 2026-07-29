import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "./theme-toggle";

const navLinks = [
  { href: "/noticias", label: "Notícias" },
  { href: "/agenda", label: "Agenda" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/cantos-da-torcida", label: "Cantos da Torcida" },
  { href: "/videos", label: "Vídeos" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="NET FOR — Início" className="shrink-0">
          <Image
            src="/netfor.svg"
            alt="NET FOR"
            width={110}
            height={30}
            priority
            className="hidden dark:block"
          />
          <Image
            src="/netfor-blue.svg"
            alt="NET FOR"
            width={110}
            height={30}
            priority
            className="dark:hidden"
          />
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm font-medium text-muted">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/noticias"
            aria-label="Buscar notícias"
            className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-4"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Nav mobile: trilho horizontal com scroll, sem JS */}
      <nav aria-label="Principal (mobile)" className="border-t border-line md:hidden">
        <ul className="scrollbar-none flex items-center gap-5 overflow-x-auto px-4 py-2 text-sm font-medium whitespace-nowrap text-muted">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
