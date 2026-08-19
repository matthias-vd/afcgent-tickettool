import nodemailer from "nodemailer";
import { getEvent } from "./config";
import { formatEventDate } from "./datetime";
import { foodLabel } from "./food";
import { qrPngBuffer } from "./qr";
import { ticketUrl } from "./ticket";
import type { Registration } from "./types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendTicketEmail(registration: Registration) {
  if (!isMailConfigured()) {
    return { sent: false as const, reason: "not-configured" as const };
  }

  const event = getEvent();
  const qr = await qrPngBuffer(registration.ticketToken);
  const link = ticketUrl(registration.ticketToken);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: registration.email,
    subject: `Je ticket voor ${event.name}`,
    text: [
      `Hallo ${registration.name},`,
      "",
      `Je inschrijving voor ${event.name} is bevestigd.`,
      `${formatEventDate(event.date)} — ${event.location}`,
      `Voedselvoorkeur: ${foodLabel(registration.foodPreference)}`,
      "",
      `Toon je QR-code aan de ingang. Ticket: ${link}`,
    ].join("\n"),
    html: `
      <div style="background:#f0f2f5;padding:32px 16px;font-family:'Josefin Sans',Arial,sans-serif;color:#081C3C;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d8dee8;border-radius:16px;">
          <tr>
            <td style="padding:32px 28px 16px;">
              <p style="margin:0 0 8px;letter-spacing:.16em;text-transform:uppercase;font-size:11px;color:#EC6525;">Ticket bevestigd</p>
              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;font-weight:700;">${escapeHtml(event.name)}</h1>
              <p style="margin:0;font-size:16px;line-height:1.5;">Hallo ${escapeHtml(registration.name)}, je inschrijving is binnen. Bewaar deze mail of toon de QR-code aan de ingang.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;text-align:center;">
              <img src="cid:ticket-qr" alt="QR-code ticket" width="220" height="220" style="width:220px;height:220px;border-radius:12px;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;font-size:14px;line-height:1.6;color:#5c6b80;">
              <p style="margin:0 0 6px;"><strong style="color:#081C3C;">Wanneer</strong> ${escapeHtml(formatEventDate(event.date))}</p>
              <p style="margin:0 0 6px;"><strong style="color:#081C3C;">Waar</strong> ${escapeHtml(event.location)}</p>
              <p style="margin:0 0 18px;"><strong style="color:#081C3C;">Eten</strong> ${escapeHtml(foodLabel(registration.foodPreference))}</p>
              <a href="${link}" style="display:inline-block;background:#081C3C;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;">Open je ticket</a>
            </td>
          </tr>
        </table>
      </div>
    `,
    attachments: [
      {
        filename: "ticket-qr.png",
        content: qr,
        cid: "ticket-qr",
      },
    ],
  });

  return { sent: true as const };
}
