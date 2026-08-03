"use client";

import { useActionState } from "react";

import { entrar } from "../actions";

/**
 * Client component só por causa do erro inline (useActionState). O envio segue
 * funcionando sem JavaScript — é um <form> com Server Action.
 */
export function FormularioLogin() {
  const [erro, acao, enviando] = useActionState(entrar, null);

  return (
    <form action={acao} className="mt-6 space-y-3">
      <label htmlFor="senha" className="block text-sm font-medium">
        Senha
      </label>
      <input
        id="senha"
        name="senha"
        type="password"
        required
        autoComplete="current-password"
        className="w-full rounded-[--radius-card] border border-line bg-surface px-3 py-2 text-sm hover:border-primary/40 focus:border-primary/60"
      />
      {erro && (
        <p role="alert" className="text-sm text-primary-text">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="h-10 w-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
