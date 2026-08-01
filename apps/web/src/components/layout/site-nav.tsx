"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Navegação do masthead.
 *
 * Dois problemas resolvidos aqui:
 *
 * 1. **Não havia indicação de página atual.** O trilho tratava todos os links
 *    igual, então o leitor não sabia onde estava. Agora a seção ativa ganha
 *    marcação visual E `aria-current="page"` — o segundo é o que leitor de tela
 *    anuncia; sem ele a indicação existe só para quem enxerga.
 *
 * 2. **No celular o trilho era o mesmo do desktop**, com rolagem horizontal —
 *    padrão ruim, porque o usuário não vê que há mais itens fora da tela. Vira
 *    hambúrguer com painel em tela cheia, onde cada destino tem alvo grande.
 */

const links = [
  { href: "/noticias", label: "Notícias" },
  { href: "/agenda", label: "Agenda" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/videos", label: "Vídeos" },
  { href: "/cantos-da-torcida", label: "Cantos da Torcida" },
];

function estaAtivo(pathname: string, href: string): boolean {
  // Prefixo, não igualdade: /noticias/<slug> mantém "Notícias" marcado.
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [rotaDoPainel, setRotaDoPainel] = useState(pathname);

  // Fecha ao navegar. Derivado durante a renderização em vez de `setState` em
  // efeito — chamar setState direto no efeito dispara renderização em cascata.
  if (rotaDoPainel !== pathname) {
    setRotaDoPainel(pathname);
    if (aberto) setAberto(false);
  }

  // Painel em tela cheia trava a rolagem do fundo; sem isso o corpo rola atrás.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <>
      {/* Desktop: trilho horizontal com a seção ativa sublinhada. */}
      <nav aria-label="Seções" className="hidden border-t border-line md:block">
        <ul className="mx-auto flex max-w-6xl items-center gap-6 px-4 font-display text-sm font-bold tracking-wide uppercase">
          {links.map((link) => {
            const ativo = estaAtivo(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`inline-block border-b-2 py-2.5 transition-colors ${
                    ativo
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile: gatilho do painel. */}
      <div className="border-t border-line md:hidden">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 font-display text-sm font-bold tracking-wide uppercase"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="size-5"
            aria-hidden
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Seções
          <span className="ml-auto text-xs font-medium text-muted normal-case">
            {links.find((l) => estaAtivo(pathname, l.href))?.label ?? "Início"}
          </span>
        </button>
      </div>

      {aberto && (
        <div
          id="menu-mobile"
          className="fixed inset-0 z-[120] flex flex-col bg-background md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de seções"
        >
          <div className="flex items-center justify-between border-b-[3px] border-primary px-4 py-4">
            <span className="font-display text-lg font-extrabold tracking-tight uppercase">
              Seções
            </span>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar menu"
              className="flex size-10 items-center justify-center border border-line"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="size-5"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav aria-label="Seções" className="flex-1 overflow-y-auto">
            <ul>
              <li>
                <Link
                  href="/"
                  aria-current={pathname === "/" ? "page" : undefined}
                  className={`flex items-center justify-between border-b border-line px-4 py-5 font-display text-2xl font-extrabold tracking-tight uppercase ${
                    pathname === "/" ? "text-primary-text" : ""
                  }`}
                >
                  Início
                  {pathname === "/" && <span className="h-2 w-8 bg-primary" aria-hidden />}
                </Link>
              </li>
              {links.map((link) => {
                const ativo = estaAtivo(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={ativo ? "page" : undefined}
                      className={`flex items-center justify-between border-b border-line px-4 py-5 font-display text-2xl font-extrabold tracking-tight uppercase ${
                        ativo ? "text-primary-text" : ""
                      }`}
                    >
                      {link.label}
                      {ativo && <span className="h-2 w-8 bg-primary" aria-hidden />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
