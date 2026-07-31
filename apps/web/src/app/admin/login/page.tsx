import { FormularioLogin } from "./formulario";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-2xl font-extrabold">Painel NETFOR</h1>
      <p className="mt-2 text-sm text-muted">Acesso restrito.</p>
      <FormularioLogin />
    </div>
  );
}
