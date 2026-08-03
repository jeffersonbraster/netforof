import type { Chant } from "@netfor/db";

import { AreaDeTexto, Botao, Campo, Entrada, Selecao } from "../ui";

/**
 * Formulário do canto, compartilhado por criar e editar.
 *
 * Uma peça só para as duas telas: eram os mesmos sete campos, e mantê-las
 * separadas garantiria que uma ganhasse um campo novo e a outra não — o jeito
 * clássico de o painel ficar inconsistente sozinho.
 *
 * `canto` ausente = criação.
 */
export function FormularioDeCanto({
  acao,
  canto,
  ordemSugerida,
}: {
  acao: (dados: FormData) => Promise<void>;
  canto?: Chant;
  ordemSugerida?: number;
}) {
  const editando = canto !== undefined;

  return (
    <form action={acao} className="space-y-4">
      {editando && <input type="hidden" name="id" value={canto.id} />}

      <Campo id="titulo" rotulo="Título" obrigatorio>
        <Entrada
          id="titulo"
          name="titulo"
          defaultValue={canto?.title ?? ""}
          required
          maxLength={120}
          placeholder="Ex.: Eu sou tricolor de coração"
          className="font-display text-lg font-bold"
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id="categoria" rotulo="Tipo">
          <Selecao id="categoria" name="categoria" defaultValue={canto?.category ?? "canto"}>
            <option value="canto">Canto da arquibancada</option>
            <option value="hino">Hino</option>
          </Selecao>
        </Campo>

        <Campo
          id="ordem"
          rotulo="Ordem"
          dica="Menor aparece antes. Deixe espaço entre os números (10, 20, 30) para caber um canto novo no meio depois."
        >
          <Entrada
            id="ordem"
            name="ordem"
            type="number"
            min={0}
            max={999}
            defaultValue={canto?.order ?? ordemSugerida ?? 0}
            aria-describedby="ordem-dica"
          />
        </Campo>

        {editando && (
          <Campo
            id="slug"
            rotulo="Endereço"
            dica="Só mude se realmente precisar: links já compartilhados param de abrir."
          >
            <Entrada
              id="slug"
              name="slug"
              defaultValue={canto.slug}
              aria-describedby="slug-dica"
            />
          </Campo>
        )}
      </div>

      <Campo
        id="video"
        rotulo="Vídeo do YouTube"
        dica="Cole o endereço inteiro ou só o ID — os dois funcionam. Vazio esconde o player."
      >
        <Entrada
          id="video"
          name="video"
          defaultValue={canto?.videoId ?? ""}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-describedby="video-dica"
        />
      </Campo>

      <Campo id="imagemUrl" rotulo="Capa" dica="Vazio usa o banner do NETFOR.">
        <Entrada
          id="imagemUrl"
          name="imagemUrl"
          defaultValue={canto?.imageUrl ?? ""}
          placeholder="https://…"
          aria-describedby="imagemUrl-dica"
        />
      </Campo>

      <Campo
        id="letra"
        rotulo="Letra"
        obrigatorio
        dica="Uma linha por verso. A página pública respeita as quebras exatamente como estão aqui."
      >
        <AreaDeTexto
          id="letra"
          name="letra"
          rows={16}
          defaultValue={canto?.lyrics ?? ""}
          required
          aria-describedby="letra-dica"
          className="font-mono text-[13px]"
        />
      </Campo>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Botao type="submit" variante="primario">
          {editando ? "Salvar" : "Criar canto"}
        </Botao>
      </div>
    </form>
  );
}
