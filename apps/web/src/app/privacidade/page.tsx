import type { Metadata } from "next";
import Link from "next/link";

import { SectionTitle } from "@/components/ui/section-title";

export const metadata: Metadata = {
  alternates: { canonical: "/privacidade" },
  title: "Política de Privacidade",
  description:
    "Como o NETFOR trata dados pessoais, cookies e publicidade, em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SectionTitle>Política de Privacidade</SectionTitle>
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-muted">Última atualização: agosto de 2026.</p>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">1. Quem somos</h2>
          <p>
            O <strong>NETFOR</strong> (netfor.com.br) é um portal de notícias sobre o
            Fortaleza Esporte Clube. Contato:{" "}
            <a
              href="mailto:contato@netfor.com.br"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              contato@netfor.com.br
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">2. Dados que coletamos</h2>
          <p>
            <strong>Não exigimos cadastro</strong> para navegar. Coletamos métricas de audiência:
            contagem de leituras por matéria (agregada, feita por nós) e estatísticas de uso do
            site pelo Google Analytics — páginas vistas, origem da visita, tipo de dispositivo e
            região aproximada. <strong>Não identificamos você pelo nome</strong> e não vendemos
            dados pessoais.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-bold">3. Cookies e publicidade</h2>
          <p>
            Usamos o <strong>Google Analytics 4</strong> para medir audiência. Ele grava um cookie
            com um identificador aleatório do navegador, que serve só para distinguir uma visita da
            outra — não guarda nome, e-mail nem endereço IP completo. Para não aparecer nessa
            medição, instale o{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              complemento de desativação do Google Analytics
            </a>
            .
          </p>
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
              href="mailto:contato@netfor.com.br"
              className="text-link underline underline-offset-4 hover:text-foreground"
            >
              contato@netfor.com.br
            </a>
            . Responderemos no menor prazo possível.
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
