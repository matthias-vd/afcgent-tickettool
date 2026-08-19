import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-card p-8">
        <p className="text-sm tracking-[0.18em] uppercase text-muted">Organisatie</p>
        <h1 className="serif mt-3 text-4xl">AFC Ticketing</h1>
        <p className="mt-3 mb-8 text-muted">
          Log in om te scannen, aanwezigheid te zien en de CSV te exporteren.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
