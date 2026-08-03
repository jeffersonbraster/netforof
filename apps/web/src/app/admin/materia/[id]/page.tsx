import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { formatShortDateTime } from "@/lib/format";
import { buscarMateria, ROTULO_ESTADO } from "@/modules/admin/queries";

import { arquivar, devolverParaRevisao, salvar } from "../../actions";
import {
  AreaDeTexto,
  Aviso,
  Botao,
  Campo,
  Cartao,
  Entrada,
  Selo,
  TituloDaTela,
} from "../../ui";

type Params = Promise<{ id: string }>;
type Busca = Promise<{ salvo?: string }>;

export default function EditarPage(props: { params: Params; searchParams: Busca }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Editor {...props} />
    </Suspense>
  );
}

async function Editor({ params, searchParams }: { params: Params; searchParams: Busca }) {
  if (!(await sessaoValida())) redirect("/admin/login");

  const { id } = await params;
  const { salvo } = await searchParams;
  const numero = Number.parseInt(id, 10);
  if (!Number.isInteger(numero)) notFound();

  const materia = await buscarMateria(numero);
  if (!materia) notFound();

  const voltarPara = `/admin/materia/${materia.id}`;

  return (
    <>
      <TituloDaTela
        descricao={
          <>
            <strong className="text-foreground">{materia.veiculo}</strong> ·{" "}
            {formatShortDateTime(materia.publicadaEm)}
            {materia.modelo && ` · ${materia.modelo}`}
            {materia.reescritaEm && ` · reescrita em ${formatShortDateTime(materia.reescritaEm)}`}
            {" · "}
            <a
              href={materia.urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              abrir original ↗
            </a>
          </>
        }
        acoes={
          <>
            <Selo tom={materia.estado === "published" ? "ativo" : "neutro"}>
              {ROTULO_ESTADO[materia.estado]}
            </Selo>
            <Link
              href={`/admin?estado=${materia.estado}`}
              className="text-sm whitespace-nowrap text-link hover:underline"
            >
              ← voltar à lista
            </Link>
          </>
        }
      >
        Editar matéria
      </TituloDaTela>

      {salvo && <Aviso>Alterações salvas.</Aviso>}

      <form action={salvar} className="space-y-4">
        <input type="hidden" name="id" value={materia.id} />
        <input type="hidden" name="slug" value={materia.slug} />

        <Cartao className="p-4">
          <h2 className="font-display mb-3 text-sm font-bold tracking-widest uppercase">Capa</h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-[--radius-card] border border-line bg-surface-2 sm:w-64">
              {/* eslint-disable-next-line @next/next/no-img-element -- painel interno: sem otimizador, a URL muda a cada edição */}
              <img
                src={materia.imagemUrl ?? "/netfor-banner.jpeg"}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Campo
                id="imagemUrl"
                rotulo="URL da imagem"
                dica="A foto é do veículo de origem e aparece creditada na matéria. Se estiver inadequada, apague o campo para usar o banner próprio."
              >
                <Entrada
                  id="imagemUrl"
                  name="imagemUrl"
                  defaultValue={materia.imagemUrl ?? ""}
                  placeholder="Vazio usa o banner do NETFOR"
                  aria-describedby="imagemUrl-dica"
                />
              </Campo>
            </div>
          </div>
        </Cartao>

        <Campo id="titulo" rotulo="Título" obrigatorio>
          <Entrada
            id="titulo"
            name="titulo"
            defaultValue={materia.titulo}
            required
            className="font-display text-lg font-bold"
          />
        </Campo>

        <Campo id="categoria" rotulo="Categoria">
          <Entrada id="categoria" name="categoria" defaultValue={materia.categoria ?? ""} />
        </Campo>

        <Campo id="resumo" rotulo="Resumo (linha fina e meta description)" obrigatorio>
          <AreaDeTexto id="resumo" name="resumo" rows={2} defaultValue={materia.resumo} required />
        </Campo>

        <Campo
          id="conteudo"
          rotulo={`Texto · ${materia.conteudo ? materia.conteudo.split(/\n\s*\n/).length : 0} parágrafos · ${materia.tamanhoTexto} caracteres`}
          dica="Parágrafos separados por linha em branco. Declaração entre aspas pode ficar idêntica ao original, desde que atribuída a quem falou."
        >
          <AreaDeTexto
            id="conteudo"
            name="conteudo"
            rows={18}
            defaultValue={materia.conteudo}
            aria-describedby="conteudo-dica"
          />
        </Campo>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Botao type="submit">Salvar</Botao>
          <Botao type="submit" name="publicar" value="1" variante="primario">
            {materia.estado === "published" ? "Salvar (segue no ar)" : "Salvar e publicar"}
          </Botao>
        </div>
      </form>

      {/*
        Fora do formulário de edição de propósito: são mudanças de ESTADO, e
        misturá-las com o botão de salvar levaria o operador a arquivar quando
        queria só corrigir uma vírgula.

        id e slug vão por `.bind()` — mesma assinatura usada na lista, onde campo
        oculto não serve porque tudo vive num formulário só.
      */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {materia.estado !== "hidden" && (
          <form action={arquivar.bind(null, materia.id, materia.slug)}>
            <input type="hidden" name="voltar" value={voltarPara} />
            <Botao type="submit" variante="perigo">
              {materia.estado === "published" ? "Despublicar" : "Descartar"}
            </Botao>
          </form>
        )}

        {materia.estado !== "review" && (
          <form action={devolverParaRevisao.bind(null, materia.id, materia.slug)}>
            <input type="hidden" name="voltar" value={voltarPara} />
            <Botao type="submit">
              {materia.estado === "hidden" ? "Restaurar" : "Voltar para revisão"}
            </Botao>
          </form>
        )}

        {materia.estado === "published" && (
          <Link
            href={`/noticias/${materia.slug}`}
            target="_blank"
            className="text-sm whitespace-nowrap text-link hover:underline"
          >
            ver no site ↗
          </Link>
        )}

        <p className="w-full text-xs text-muted">
          Descartar manda para a lixeira — sai da fila e do site, continua no banco e pode voltar.
        </p>
      </div>
    </>
  );
}
