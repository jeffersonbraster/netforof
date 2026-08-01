import {
  INSTRUCAO_SISTEMA,
  type MateriaReescrita,
  type PedidoDeReescrita,
  type ProvedorDeReescrita,
} from "./provider";

/** Tier mini: barato e mais que suficiente para texto factual curto. */
const MODELO_PADRAO = "gpt-5.4-mini";

/** Teto do insumo. Matéria de portal raramente passa disso, e limita custo. */
const MAX_CHARS_ENTRADA = 12_000;

interface RespostaOpenAI {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function extrairJson(bruto: string): unknown {
  // O modelo às vezes embrulha em cerca de código mesmo instruído a não fazer.
  const limpo = bruto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(limpo);
}

function validar(dados: unknown): MateriaReescrita {
  if (typeof dados !== "object" || dados === null) throw new Error("resposta não é objeto");
  const d = dados as Record<string, unknown>;

  const titulo = typeof d.titulo === "string" ? d.titulo.trim() : "";
  const resumo = typeof d.resumo === "string" ? d.resumo.trim() : "";
  const paragrafos = Array.isArray(d.paragrafos)
    ? d.paragrafos.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];

  if (!titulo) throw new Error("título ausente");
  if (!resumo) throw new Error("resumo ausente");
  // Piso baixo de propósito: exigir muitos parágrafos empurra o modelo a
  // inflar. Dois parágrafos honestos valem mais que cinco com enchimento.
  if (paragrafos.length < 2) throw new Error(`só ${paragrafos.length} parágrafo(s)`);

  return { titulo, resumo, paragrafos: paragrafos.map((p) => p.trim()) };
}

export function criarProvedorOpenAI(): ProvedorDeReescrita {
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) throw new Error("OPENAI_API_KEY não configurada");
  const modelo = process.env.REWRITE_MODEL ?? MODELO_PADRAO;

  return {
    nome: "openai",
    modelo,

    async reescrever(pedido: PedidoDeReescrita): Promise<MateriaReescrita> {
      const entrada = [
        pedido.reforco ? `ATENÇÃO: ${pedido.reforco}\n` : "",
        `Veículo que apurou: ${pedido.veiculo}`,
        `Título original (contexto, não copie): ${pedido.tituloOriginal}`,
        "",
        "TEXTO ORIGINAL:",
        pedido.textoOriginal.slice(0, MAX_CHARS_ENTRADA),
      ].join("\n");

      const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${chave}`,
        },
        body: JSON.stringify({
          model: modelo,
          messages: [
            { role: "system", content: INSTRUCAO_SISTEMA },
            { role: "user", content: entrada },
          ],
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(90_000),
      });

      const corpo = (await resposta.json().catch(() => ({}))) as RespostaOpenAI;

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status} — ${corpo.error?.message ?? "sem detalhe"}`);
      }

      const conteudo = corpo.choices?.[0]?.message?.content;
      if (!conteudo) throw new Error("resposta vazia");

      return validar(extrairJson(conteudo));
    },
  };
}
