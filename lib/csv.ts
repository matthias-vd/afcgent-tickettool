import { formatDateTime } from "./datetime";
import { foodLabel } from "./food";
import type { Registration } from "./types";

function csvCell(value: string) {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

export function registrationsToCsv(rows: Registration[]) {
  const header = [
    "Event",
    "Naam",
    "E-mail",
    "Telefoon",
    "Voedselvoorkeur",
    "Extra info",
    "CV",
    "Ingeschreven op",
    "Aanwezig",
    "Check-in tijd",
    "Ticketcode",
  ];

  const lines = rows.map((row) =>
    [
      row.eventName,
      row.name,
      row.email,
      row.phone,
      foodLabel(row.foodPreference),
      row.extraInfo,
      row.cvOriginalName,
      formatDateTime(row.createdAt),
      row.checkedInAt ? "Ja" : "Nee",
      formatDateTime(row.checkedInAt),
      row.ticketToken,
    ]
      .map(csvCell)
      .join(";"),
  );

  return `\uFEFF${header.join(";")}\n${lines.join("\n")}\n`;
}
