import Link from "next/link";

export function SectionTitle({
  children,
  href,
  linkLabel = "Ver todas",
}: {
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="flex items-center gap-3 font-display text-lg font-extrabold uppercase tracking-wide">
        <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
        {children}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-xs font-medium text-link hover:underline underline-offset-4"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
