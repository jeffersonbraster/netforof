import Link from "next/link";

type ButtonVariant = "primary" | "outline" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary/85",
  outline:
    "border border-line bg-surface text-foreground hover:border-primary/50 hover:text-primary",
  ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  href,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}
