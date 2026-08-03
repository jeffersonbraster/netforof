import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";

import { criarMateria } from "../../actions";
import { AreaDeTexto, Botao, Campo, Entrada, TituloDaTela } from "../../ui";

export default function NovaMateriaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Formulario />
    </Suspense>
  );
}

async function Formulario() {
  if (!(await sessaoValida())) redirect("/admin/login");

  return (
    <>
      <TituloDaTela
        descricao="Conteúdo autoral do NETFOR — avisos do portal, tutoriais, análises, especiais. Não passa pela coleta nem pela reescrita: o texto é seu do começo ao fim."
        acoes={
          <Link href="/admin" className="text-sm whitespace-nowrap text-link hover:underline">
            ← voltar à lista
          </Link>
        }
      >
        Nova matéria
      </TituloDaTela>

      <form action={criarMateria} className="space-y-4">
        <Campo
          id="titulo"
          rotulo="Título"
          obrigatorio
          dica="O endereço da página é gerado a partir daqui."
        >
          <Entrada
            id="titulo"
            name="titulo"
            required
            aria-describedby="titulo-dica"
            className="font-display text-lg font-bold"
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="categoria" rotulo="Categoria">
            <Entrada id="categoria" name="categoria" placeholder="Ex.: Portal, Tutorial, Análise" />
          </Campo>
          <Campo id="imagemUrl" rotulo="URL da capa">
            <Entrada
              id="imagemUrl"
              name="imagemUrl"
              placeholder="Vazio usa o banner do NETFOR"
            />
          </Campo>
        </div>

        <Campo id="resumo" rotulo="Resumo (linha fina e meta description)" obrigatorio>
          <AreaDeTexto id="resumo" name="resumo" rows={2} required />
        </Campo>

        <Campo id="conteudo" rotulo="Texto" obrigatorio>
          <AreaDeTexto
            id="conteudo"
            name="conteudo"
            rows={18}
            required
            placeholder={"Um parágrafo por bloco.\n\nSepare os parágrafos com uma linha em branco."}
          />
        </Campo>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Botao type="submit">Salvar rascunho</Botao>
          <Botao type="submit" name="publicar" value="1" variante="primario">
            Publicar agora
          </Botao>
        </div>
      </form>
    </>
  );
}
