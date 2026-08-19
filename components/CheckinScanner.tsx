"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { foodLabel } from "@/lib/food";

type ScanResult = {
  kind: "ok" | "repeat" | "error";
  title: string;
  detail: string;
};

export function CheckinScanner() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manual, setManual] = useState("");
  const busy = useRef(false);

  const submit = useCallback(async (body: Record<string, string>) => {
    if (busy.current) return;
    busy.current = true;
    setPaused(true);

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        error?: string;
        name?: string;
        alreadyCheckedIn?: boolean;
        foodPreference?: string;
      };

      if (!response.ok) {
        setResult({
          kind: "error",
          title: "Niet herkend",
          detail: payload.error ?? "Dit ticket staat niet in de lijst.",
        });
        return;
      }

      if (payload.alreadyCheckedIn) {
        setResult({
          kind: "repeat",
          title: payload.name ?? "Al binnengelaten",
          detail: "Dit ticket is eerder al gescand.",
        });
        return;
      }

      setResult({
        kind: "ok",
        title: payload.name ?? "Welkom",
        detail: payload.foodPreference
          ? `Eten: ${foodLabel(payload.foodPreference)}`
          : "Check-in geregistreerd.",
      });
    } catch {
      setResult({
        kind: "error",
        title: "Geen verbinding",
        detail: "Check-in kon niet worden opgeslagen.",
      });
    } finally {
      window.setTimeout(() => {
        setResult(null);
        setPaused(false);
        busy.current = false;
      }, 2400);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="rounded-[28px] border border-line bg-card px-6 py-16 text-center text-muted">
        Camera wordt geladen…
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="overflow-hidden rounded-[28px] border border-line bg-ink">
        <Scanner
          paused={paused}
          formats={["qr_code"]}
          sound
          onScan={(codes) => {
            const payload = codes[0]?.rawValue;
            if (payload) void submit({ payload });
          }}
          classNames={{ container: "min-h-[360px]" }}
        />
      </div>
      <div className="rounded-[28px] border border-line bg-card p-6">
        {result ? (
          <div
            className={`rounded-3xl px-5 py-6 ${
              result.kind === "ok"
                ? "bg-ok/15"
                : result.kind === "repeat"
                  ? "bg-warn/15"
                  : "bg-accent/10"
            }`}
          >
            <p className="text-sm uppercase tracking-[0.16em] text-muted">
              {result.kind === "ok"
                ? "Binnen"
                : result.kind === "repeat"
                  ? "Al gescand"
                  : "Fout"}
            </p>
            <h2 className="serif mt-2 text-3xl">{result.title}</h2>
            <p className="mt-3 text-muted">{result.detail}</p>
          </div>
        ) : (
          <div>
            <h2 className="serif text-3xl">Scan een ticket</h2>
            <p className="mt-3 text-muted">
              Richt de camera op de QR-code. Het resultaat wordt meteen
              opgeslagen.
            </p>
          </div>
        )}

        <form
          className="mt-8 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!manual.trim()) return;
            const value = manual.trim();
            setManual("");
            void submit(
              value.includes("@") ? { email: value } : { payload: value },
            );
          }}
        >
          <label htmlFor="manual" className="text-sm font-semibold">
            Handmatig (e-mail of ticketcode)
          </label>
          <input
            id="manual"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            className="rounded-2xl border border-line bg-card px-4 py-3"
            placeholder="naam@email.be"
          />
          <button
            type="submit"
            className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-card"
          >
            Check in
          </button>
        </form>
      </div>
    </div>
  );
}
