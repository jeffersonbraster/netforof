import type { Metadata } from "next";
import Link from "next/link";

import { SectionTitle } from "@/components/ui/section-title";

export const metadata: Metadata = {
  alternates: { canonical: "/termos" },
  title: "Termos de Uso",
  description: "Condições de uso, política editorial e de correções do portal NETFOR.",
};

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SectionTitle>Termos de Uso</SectionTitle>
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-muted">Última atualização: agosto de 2026.</p>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">1. O serviço</h2>
          <p>
            O NETFOR é um portal de notícias sobre o Fortaleza Esporte Clube. Publicamos{" "}
            <strong>conteúdo de nossa autoria</strong> e creditamos as fontes das informações
            quando aplicável. O portal é independente e{" "}
            <strong>não possui vínculo oficial com o Fortaleza EC</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">2. Propriedade intelectual</h2>
          <p>
            O conteúdo editorial do NETFOR é de nossa autoria. Imagens e marcas de terceiros
            pertencem aos seus respectivos titulares.
          </p>
          <p>
            Titulares de direitos que identifiquem necessidade de ajuste, crédito ou remoção podem
            entrar em contato pelo e-mail{" "}
            <a
              href="mailto:contato@netfor.com.br"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              contato@netfor.com.br
            </a>{" "}
            — atenderemos prontamente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">3. Política editorial e correções</h2>
          <p>
            Nosso conteúdo passa por <strong>revisão editorial antes da publicação</strong>.
            Prezamos pela precisão factual e não publicamos informação que não possamos verificar
            na origem.
          </p>
          <p>
            Se identificar qualquer imprecisão, escreva para{" "}
            <a
              href="mailto:contato@netfor.com.br"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              contato@netfor.com.br
            </a>
            . Conteúdo com erro é corrigido ou removido assim que verificamos o apontamento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">4. Publicidade e apostas</h2>
          <p>
            O portal exibe anúncios (Google AdSense) e pode veicular patrocínios diretos, inclusive
            de casas de apostas <strong>licenciadas pela SPA/MF</strong>, nos termos da Lei nº
            14.790/2023. Conteúdo de apostas é destinado a <strong>maiores de 18 anos</strong>.
            Jogue com responsabilidade: apostas envolvem risco financeiro e não são fonte de renda.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">5. Isenção de responsabilidade</h2>
          <p>
            Informações de jogos, horários e classificação são fornecidas por fontes externas e
            podem sofrer alterações sem aviso. O NETFOR não se responsabiliza por decisões tomadas
            com base no conteúdo exibido.
          </p>
        </section>

        <p>
          Veja também a{" "}
          <Link
            href="/privacidade"
            className="text-link underline underline-offset-4 hover:text-foreground"
          >
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
