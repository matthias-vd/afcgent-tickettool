import Link from "next/link";

/**
 * Uses the light-background AFC mark (`afc-gent-logo.svg`).
 * White letter fills are adapted to AFC navy via `lib/logo.ts`
 * (see `adaptLogoSvgForLightBackground`).
 */
export function SiteHeader({
  rightHref = "/admin/login",
  rightLabel = "Organisatie",
}: {
  rightHref?: string;
  rightLabel?: string;
}) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="inline-flex items-center" aria-label="AFC Gent home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/afc-gent-logo.svg"
          alt="AFC Gent"
          className="h-10 w-auto sm:h-12"
        />
      </Link>
      <Link href={rightHref} className="text-sm text-muted hover:text-ink">
        {rightLabel}
      </Link>
    </header>
  );
}
