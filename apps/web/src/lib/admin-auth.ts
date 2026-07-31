import { cookies } from "next/headers";

/**
 * Autenticação do painel.
 *
 * Uma senha só, porque há um único operador. O que não é negociável, mesmo
 * nessa simplicidade:
 *
 * - a senha vive em secret do Worker, nunca no código;
 * - a comparação é em tempo constante (o `!==` vaza pelo tempo de resposta);
 * - o cookie é assinado com HMAC, senão qualquer um forja `admin=1`;
 * - trocar a senha invalida as sessões, porque ela é a própria chave da assinatura.
 */

const COOKIE = "netfor_admin";
const DURACAO_MS = 12 * 60 * 60 * 1000;

function senhaConfigurada(): string | null {
  const s = process.env.ADMIN_PASSWORD;
  return s && s.length >= 12 ? s : null;
}

function comparaEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

async function assinar(payload: string, chave: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(chave),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function senhaCorreta(tentativa: string): boolean {
  const senha = senhaConfigurada();
  if (!senha) return false;
  return comparaEmTempoConstante(tentativa, senha);
}

export async function criarSessao(): Promise<void> {
  const senha = senhaConfigurada();
  if (!senha) throw new Error("ADMIN_PASSWORD não configurada");

  const expiraEm = String(Date.now() + DURACAO_MS);
  const valor = `${expiraEm}.${await assinar(expiraEm, senha)}`;

  (await cookies()).set(COOKIE, valor, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: DURACAO_MS / 1000,
  });
}

export async function encerrarSessao(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function sessaoValida(): Promise<boolean> {
  // Ler o cookie ANTES de qualquer atalho é obrigatório, não estilo: é o acesso
  // ao cookie que marca a rota como dinâmica. Quando a checagem de senha vinha
  // primeiro, o build (sem ADMIN_PASSWORD no ambiente) retornava antes de tocar
  // em `cookies()`, o Next não via IO dinâmico e pré-renderizava o redirect para
  // /admin/login — servido depois com s-maxage de um dia. Resultado: ninguém
  // entrava no painel nem com o cookie certo.
  const bruto = (await cookies()).get(COOKIE)?.value;

  const senha = senhaConfigurada();
  if (!senha || !bruto) return false;

  const [expiraEm, assinatura] = bruto.split(".");
  if (!expiraEm || !assinatura) return false;

  const prazo = Number.parseInt(expiraEm, 10);
  if (!Number.isFinite(prazo) || prazo < Date.now()) return false;

  return comparaEmTempoConstante(assinatura, await assinar(expiraEm, senha));
}

/** Toda Server Action revalida por conta própria: o gate do layout não a protege. */
export async function exigirSessao(): Promise<void> {
  if (!(await sessaoValida())) throw new Error("não autorizado");
}
