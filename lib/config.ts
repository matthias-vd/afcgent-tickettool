export function getEvent() {
  return {
    name: process.env.EVENT_NAME?.trim() || "AFC Avond",
    date: process.env.EVENT_DATE?.trim() || "2026-09-12T18:00",
    location: process.env.EVENT_LOCATION?.trim() || "Campus, lokaal 1.01",
    intro:
      process.env.EVENT_INTRO?.trim() ||
      "Schrijf je in voor de avond. Na inschrijving ontvang je een ticket met QR-code. Toon die code aan de ingang.",
  };
}

export function getAppUrl(): string {
  return (process.env.APP_URL?.trim() || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "admin123";
}
