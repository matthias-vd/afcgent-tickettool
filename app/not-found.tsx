import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm tracking-[0.18em] uppercase text-muted">404</p>
      <h1 className="serif mt-3 text-4xl">Ticket niet gevonden</h1>
      <p className="mt-3 max-w-md text-muted">
        Deze link hoort bij geen inschrijving. Controleer de code of schrijf je opnieuw in.
      </p>
      <Link href="/" className="mt-8 rounded-full bg-forest px-5 py-3 font-semibold text-card">
        Naar inschrijving
      </Link>
    </div>
  );
}
