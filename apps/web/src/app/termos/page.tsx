import type { Metadata } from "next";
import Link from "next/link";

import { SectionTitle } from "@/components/ui/section-title";

export const metadata: Metadata = {
  alternates: { canonical: "/termos" },
  title: "Termos de Uso",
  description: "Condições de uso do portal NETFOR, agregador de notícias do Fortaleza EC.",
};

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SectionTitle>Termos de Uso</SectionTitle>
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-muted">Última atualização: julho de 2026.</p>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">1. O serviço</h2>
          <p>
            O NETFOR agrega notícias sobre o Fortaleza Esporte Clube publicadas por veículos de
            imprensa, exibindo título, resumo, imagem e{" "}
            <strong>link para a matéria original</strong> com crédito visível à fonte. O portal é
            independente e <strong>não possui vínculo oficial com o Fortaleza EC</strong> nem com os
            veículos agregados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">2. Propriedade intelectual</h2>
          <p>
            As matérias completas, títulos e imagens pertencem aos respectivos veículos, sempre
            identificados. Marcas e escudos citados pertencem aos seus titulares. Veículos que
            desejem ajustar ou remover seu conteúdo do agregador podem contatar{" "}
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
          <h2 className="font-display text-base font-bold">3. Publicidade e apostas</h2>
          <p>
            O portal exibe anúncios (Google AdSense) e pode veicular patrocínios diretos, inclusive
            de casas de apostas <strong>licenciadas pela SPA/MF</strong>, nos termos da Lei nº
            14.790/2023. Conteúdo de apostas é destinado a <strong>maiores de 18 anos</strong>.
            Jogue com responsabilidade: apostas envolvem risco financeiro e não são fonte de renda.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">4. Isenção de responsabilidade</h2>
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
