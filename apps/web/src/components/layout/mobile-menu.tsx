"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { estaAtivo, LINKS_DE_SECAO } from "./secoes";

/**
 * Menu do celular.
 *
 * Fica na fileira de ícones, ao lado da busca e do tema, e não numa barra
 * própria abaixo do wordmark: é onde o usuário já procura os controles do site.
 *
 * O painel ocupa a tela inteira. Alvo grande por destino, rolagem do fundo
 * travada enquanto aberto, Esc fecha e navegar fecha sozinho.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [rotaDoPainel, setRotaDoPainel] = useState(pathname);

  // Derivado na renderização, não em efeito: `setState` síncrono dentro de
  // efeito dispara renderização em cascata.
  if (rotaDoPainel !== pathname) {
    setRotaDoPainel(pathname);
    if (aberto) setAberto(false);
  }

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

  const destinos = [{ href: "/", label: "Início" }, ...LINKS_DE_SECAO];

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-expanded={aberto}
        aria-controls="menu-mobile"
        aria-label="Abrir menu de seções"
        className="flex size-9 items-center justify-center border border-line bg-surface text-muted transition-colors hover:border-primary/50 hover:text-foreground md:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          className="size-5"
          aria-hidden
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {aberto && (
        <div
          id="menu-mobile"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de seções"
          className="fixed inset-0 z-[120] flex flex-col bg-background md:hidden"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-4">
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
                strokeWidth="2.25"
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
              {destinos.map((destino) => {
                const ativo =
                  destino.href === "/" ? pathname === "/" : estaAtivo(pathname, destino.href);
                const destaque = "destaque" in destino && destino.destaque;
                return (
                  <li key={destino.href}>
                    <Link
                      href={destino.href}
                      aria-current={ativo ? "page" : undefined}
                      className={`flex items-center gap-3 border-b border-line px-4 py-5 font-display text-2xl font-extrabold tracking-tight uppercase ${
                        ativo ? "text-primary-text" : ""
                      }`}
                    >
                      {destino.label}
                      {destaque && (
                        <>
                          <span aria-hidden>🔥</span>
                          {/* Pílula é a única forma arredondada que o design.md
                              autoriza, e só em badge — é exatamente este caso. */}
                          <span className="rounded-[--radius-pill] bg-primary px-2 py-0.5 font-display text-[10px] font-bold tracking-wide text-white">
                            Novo
                          </span>
                        </>
                      )}
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
