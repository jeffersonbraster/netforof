import type { Metadata } from "next";

import { SectionTitle } from "@/components/ui/section-title";

export const metadata: Metadata = {
  title: "Sobre o NET FOR",
  description:
    "Conheça o NET FOR, portal que reúne as notícias do Fortaleza Esporte Clube em um só lugar, atualizado 24/7.",
};

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SectionTitle>Sobre o NET FOR</SectionTitle>
      <div className="space-y-4 leading-relaxed">
        <p>
          O <strong>NET FOR</strong> nasceu para resolver um problema de todo torcedor do Fortaleza:
          as notícias do clube estão espalhadas em dezenas de portais. Aqui você encontra tudo em um
          só lugar — atualizado 24 horas por dia, 7 dias por semana.
        </p>
        <p>
          O portal tem como objetivo manter todos os torcedores e amantes do Fortaleza informados
          sobre tudo que acontece no clube, buscando informações nas principais fontes de notícias
          sobre o Maior time do Nordeste e do mundo!!
        </p>
        <p>
          Cada notícia exibida traz o crédito e o link para a matéria original — valorizamos o
          trabalho dos veículos que cobrem o Leão do Pici diariamente.
        </p>
        <p>
          Além das notícias, você acompanha a agenda de jogos, a classificação do Brasileirão, os
          cantos da torcida e os vídeos dos últimos jogos.
        </p>
        <p className="text-sm text-muted">
          Para sugestões, dicas ou informações entre em contato pelo e-mail{" "}
          <a
            href="mailto:contato@netfor.club"
            className="text-link hover:underline underline-offset-4"
          >
            contato@netfor.club
          </a>
          .
        </p>
      </div>
    </div>
  );
}
