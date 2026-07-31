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
            O NETFOR publica <strong>textos próprios</strong> sobre fatos relativos ao Fortaleza
            Esporte Clube noticiados pela imprensa. Cada matéria é redigida por nós a partir da
            apuração de veículos jornalísticos, que são <strong>identificados e linkados</strong>{" "}
            em todas as páginas. O portal é independente e{" "}
            <strong>não possui vínculo oficial com o Fortaleza EC</strong> nem com os veículos
            citados.
          </p>
          <p>
            Não reproduzimos matérias de terceiros. Reproduzimos apenas os fatos — que não são
            objeto de direito autoral — e, quando necessário, declarações entre aspas atribuídas a
            quem as proferiu, no exercício do direito de citação.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">2. Propriedade intelectual</h2>
          <p>
            O texto publicado no NETFOR é de nossa autoria. As <strong>fotografias</strong> exibidas
            pertencem aos veículos ou fotógrafos que as produziram, sempre creditados, e são
            utilizadas para ilustrar a cobertura do fato noticiado. Marcas e escudos citados
            pertencem aos seus titulares.
          </p>
          <p>
            Veículos, fotógrafos ou titulares de direitos que desejem correção, crédito adicional
            ou remoção de qualquer conteúdo podem contatar{" "}
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
            Nossas matérias são redigidas com apoio de ferramenta automatizada de redação e{" "}
            <strong>passam por revisão humana antes da publicação</strong>. Não publicamos
            informação que não conste da apuração da fonte citada: não inferimos números, datas,
            valores ou declarações.
          </p>
          <p>
            Erros acontecem. Se você identificar qualquer imprecisão, escreva para{" "}
            <a
              href="mailto:contato@netfor.com.br"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              contato@netfor.com.br
            </a>
            . Matérias com erro são corrigidas ou despublicadas assim que verificamos o
            apontamento.
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
