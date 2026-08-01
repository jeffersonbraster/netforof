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
      <h2 className="regua-marca font-display text-2xl leading-none font-extrabold tracking-tight uppercase sm:text-[28px]">
        {children}
      </h2>
      {href && (
        <Link
          href={href}
          className="shrink-0 font-display text-xs font-bold tracking-wide text-link uppercase hover:underline underline-offset-4"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
