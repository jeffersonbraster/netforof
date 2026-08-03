import type { Metadata } from "next";
import { Suspense } from "react";

import { PainelChrome } from "./chrome";

// O painel nunca vai para índice nenhum, em nenhuma circunstância.
export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        <Suspense> obrigatório: o trilho usa `usePathname` para marcar onde o
        operador está, e com Cache Components ler a rota é dado NÃO cacheado.
        Fora de um boundary, isso trava a pré-renderização de toda rota dinâmica
        (`/admin/cantos/[id]`) e o build falha com "Uncached data was accessed
        outside of <Suspense>".

        O reservado tem a mesma altura do cabeçalho real, senão a régua vermelha
        salta quando o trilho hidrata — layout shift onde o design.md pede zero.
      */}
      <Suspense fallback={<div className="mb-8 h-[6.5rem] border-b border-line" />}>
        <PainelChrome />
      </Suspense>
      {/* `pb-16` dá respiro no celular, onde a barra do navegador come o rodapé. */}
      <div className="mx-auto max-w-5xl px-4 pb-16">{children}</div>
    </>
  );
}
