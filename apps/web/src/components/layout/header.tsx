import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { SearchDialog } from "@/components/search/search-dialog";
import { formatKickoff } from "@/lib/format";
import type { Match } from "@netfor/db";

import { MobileMenu } from "./mobile-menu";
import { SiteNav } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";

/**
 * N6 · Masthead de jornal.
 *
 * O header anterior era N1a (wordmark + links inline + botão de ícone à direita)
 * — a assinatura de IA mais reconhecível que existe, e a lupa nem buscava nada.
 *
 * O masthead troca isso por linguagem de jornal esportivo: régua vermelha grossa,
 * wordmark ancorado à esquerda e, no lugar da data de edição, a **linha de estado
 * do clube**. É o que dá vida diária ao portal — quem abre vê o Leão antes de ver
 * qualquer manchete.
 */


function LinhaDeJogo({ proximo }: { proximo: Match | null }) {
  if (!proximo) {
    return <span className="text-muted">Acompanhe o Leão do Pici · 24 horas por dia</span>;
  }

  const emCasa = proximo.homeTeam.includes("Fortaleza");
  const adversario = emCasa ? proximo.awayTeam : proximo.homeTeam;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="bg-primary px-1.5 font-bold tracking-wide text-white uppercase">
        Próximo jogo
      </span>
      <span className="font-semibold text-foreground">Fortaleza × {adversario}</span>
      <span className="text-muted">
        {formatKickoff(proximo.kickoffAt)} · {emCasa ? "em casa" : "fora"}
      </span>
    </span>
  );
}

export function Header({ proximoJogo = null }: { proximoJogo?: Match | null }) {
  return (
    <header className="border-b-[3px] border-primary bg-background">
      {/* Linha de estado: o "issue line" do masthead, virado para o clube. */}
      <div className="border-b border-line">
        <div className="mx-auto flex min-h-8 max-w-6xl items-center px-4 py-1 text-[11px] tracking-wide">
          <LinhaDeJogo proximo={proximoJogo} />
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="NETFOR — Início" className="shrink-0">
          <Image
            src="/netfor.svg"
            alt="NETFOR"
            width={132}
            height={36}
            priority
            className="hidden dark:block"
          />
          <Image
            src="/netfor-blue.svg"
            alt="NETFOR"
            width={132}
            height={36}
            priority
            className="dark:hidden"
          />
        </Link>

        <div className="flex items-center gap-2">
          <SearchDialog />
          <Suspense fallback={<div className="size-9 md:hidden" />}>
            <MobileMenu />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>

      {/* `usePathname()` é dado de requisição: com Cache Components, lê-lo fora
          de um boundary quebra o prerender das rotas. O fallback é o trilho sem
          marcação de ativo — some assim que a rota resolve. */}
      <Suspense fallback={<div className="h-11 border-t border-line" />}>
        <SiteNav />
      </Suspense>
    </header>
  );
}
