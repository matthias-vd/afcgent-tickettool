import QRCode from "qrcode";
import { ticketUrl } from "./ticket";

export async function qrDataUrl(eventSlug: string, token: string) {
  return QRCode.toDataURL(ticketUrl(eventSlug, token), {
    width: 360,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#081C3C", light: "#ffffff" },
  });
}

export async function qrPngBuffer(eventSlug: string, token: string) {
  return QRCode.toBuffer(ticketUrl(eventSlug, token), {
    width: 360,
    margin: 1,
    errorCorrectionLevel: "M",
    type: "png",
    color: { dark: "#081C3C", light: "#ffffff" },
  });
}
