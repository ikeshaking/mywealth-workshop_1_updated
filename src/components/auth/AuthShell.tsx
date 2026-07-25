import Link from "next/link";
import { MabelAvatar } from "@/components/brand/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="container-app flex h-16 items-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <MabelAvatar size={30} />
          <span className="font-semibold text-ink">Mabel</span>
        </Link>
      </header>
      <main id="main" className="container-app flex flex-1 flex-col justify-center pb-16">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>}
      </main>
    </div>
  );
}
