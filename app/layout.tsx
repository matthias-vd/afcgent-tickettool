import type { Metadata } from "next";
import { Josefin_Sans } from "next/font/google";
import "./globals.css";

const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: {
      default: "AFC Ticketing",
      template: "%s · AFC Ticketing",
    },
    description: "Inschrijvingen, QR-tickets, check-in en export voor meerdere events.",
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${josefin.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
