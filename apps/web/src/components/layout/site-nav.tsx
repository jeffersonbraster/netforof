"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { estaAtivo, LINKS_DE_SECAO } from "./secoes";

/**
 * Trilho de seções do desktop.
 *
 * A seção atual é marcada por cor e peso, sem barra: a régua vermelha do header
 * está logo abaixo e um segundo traço competia com ela. O `aria-current` é o que
 * leitor de tela anuncia — sem ele a indicação existiria só para quem enxerga.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Seções" className="hidden border-t border-line md:block">
      {/* `gap-5` no md e `gap-6` a partir do lg: com seis destinos, o trilho
          encostava nos 768px e o último item corria risco de quebrar em duas
          linhas — que o design.md proíbe em alvo clicável. */}
      <ul className="mx-auto flex max-w-6xl items-center gap-5 px-4 font-display text-sm font-bold tracking-wide whitespace-nowrap uppercase lg:gap-6">
        {LINKS_DE_SECAO.map((link) => {
          const ativo = estaAtivo(pathname, link.href);
          const destaque = "destaque" in link && link.destaque;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={ativo ? "page" : undefined}
                className={`inline-block py-2.5 transition-colors ${
                  ativo ? "text-primary-text" : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
                {destaque && (
                  <span aria-hidden className="ml-1">
                    🔥
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
