import type { Metadata } from "next";

// O painel nunca vai para índice nenhum, em nenhuma circunstância.
export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>;
}
