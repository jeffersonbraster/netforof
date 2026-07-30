import type { Metadata } from "next";
import Link from "next/link";

import { SectionTitle } from "@/components/ui/section-title";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o NET FOR trata dados pessoais, cookies e publicidade, em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SectionTitle>Política de Privacidade</SectionTitle>
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-muted">Última atualização: julho de 2026.</p>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">1. Quem somos</h2>
          <p>
            O <strong>NET FOR</strong> (netfor.club) é um portal agregador de notícias sobre o
            Fortaleza Esporte Clube. Contato:{" "}
            <a
              href="mailto:contato@netfor.club"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              contato@netfor.club
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">2. Dados que coletamos</h2>
          <p>
            <strong>Não exigimos cadastro</strong> para navegar. Coletamos apenas métricas agregadas
            e anônimas de audiência (contagem de leituras por matéria, sem identificar o visitante).
            Não vendemos dados pessoais.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">3. Cookies e publicidade</h2>
          <p>
            Exibimos anúncios do <strong>Google AdSense</strong>, que pode utilizar cookies e
            identificadores para personalizar anúncios conforme a{" "}
            <a
              href="https://policies.google.com/technologies/ads?hl=pt-BR"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              política de anúncios do Google
            </a>
            . Você pode desativar a personalização em{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              adssettings.google.com
            </a>
            . Também usamos armazenamento local do navegador para lembrar sua preferência de tema
            (claro/escuro) — esse dado não sai do seu dispositivo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">4. Seus direitos (LGPD)</h2>
          <p>
            Nos termos da Lei nº 13.709/2018 (LGPD), você pode solicitar confirmação de tratamento,
            acesso, correção ou eliminação de dados pessoais pelo e-mail{" "}
            <a
              href="mailto:contato@netfor.club"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              contato@netfor.club
            </a>
            . Responderemos no menor prazo possível.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">5. Conteúdo de terceiros</h2>
          <p>
            As notícias exibidas são resumos com crédito e link para os portais originais. Imagens
            são servidas a partir das fontes creditadas. Solicitações de remoção:{" "}
            <a
              href="mailto:contato@netfor.club"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              contato@netfor.club
            </a>
            .
          </p>
        </section>

        <p>
          Veja também os{" "}
          <Link
            href="/termos"
            className="text-link underline underline-offset-4 hover:text-foreground"
          >
            Termos de Uso
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
