"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { sair } from "./actions";

/**
 * Trilho de navegação do painel.
 *
 * Antes, "Jogos" era um botão solto no cabeçalho da tela de matérias e não havia
 * caminho de volta a não ser um "← Voltar" escrito à mão em cada tela. Com quatro
 * áreas isso deixou de escalar: o painel precisa de uma casa, não de links soltos.
 *
 * Cliente por causa do `usePathname` — é o que marca onde o operador está. O
 * `sair` é Server Action importada aqui: passar ação de servidor para componente
 * de cliente é suportado, e evita partir o cabeçalho em dois arquivos.
 */

const AREAS = [
  { href: "/admin", label: "Matérias" },
  { href: "/admin/jogos", label: "Jogos" },
  { href: "/admin/escalacao", label: "Escalação" },
  { href: "/admin/cantos", label: "Cantos" },
] as const;

/** "/admin" casa exato; o resto casa por prefixo, para as telas filhas. */
function estaAtivo(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === "/admin" || pathname.startsWith("/admin/materia")
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function PainelChrome() {
  const pathname = usePathname();

  // O login é a única tela do painel sem sessão: mostrar navegação e "Sair" ali
  // seria oferecer destino que não abre.
  if (pathname === "/admin/login") return null;

  return (
    <header className="mb-8 border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 pt-6 pb-3">
        <Link href="/admin" className="font-display text-lg font-extrabold tracking-tight uppercase">
          NET<span className="text-primary-text">FOR</span>
          <span className="ml-2 align-middle text-xs font-semibold tracking-widest text-muted">
            PAINEL
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            target="_blank"
            className="hidden text-xs font-medium whitespace-nowrap text-link hover:underline sm:inline"
          >
            ver o site ↗
          </Link>
          <form action={sair}>
            <button
              type="submit"
              className="text-xs font-medium whitespace-nowrap text-muted hover:text-foreground"
            >
              Sair
            </button>
          </form>
        </div>
      </div>

      {/*
        Rola na horizontal no celular em vez de quebrar em duas linhas: rótulo de
        navegação partido é lido como defeito. `-mb-px` encaixa a régua do item
        ativo exatamente sobre a borda do cabeçalho.
      */}
      <nav aria-label="Áreas do painel" className="mx-auto max-w-5xl overflow-x-auto px-4">
        <ul className="-mb-px flex min-w-max gap-1">
          {AREAS.map((area) => {
            const ativo = estaAtivo(pathname, area.href);
            return (
              <li key={area.href}>
                <Link
                  href={area.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`font-display inline-block border-b-[3px] px-3 pb-2.5 text-sm font-bold tracking-wide whitespace-nowrap uppercase transition-colors ${
                    ativo
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted hover:border-line hover:text-foreground"
                  }`}
                >
                  {area.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
