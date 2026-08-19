import type { Metadata } from "next";
import { Josefin_Sans } from "next/font/google";
import { getEvent } from "@/lib/config";
import "./globals.css";

const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const event = getEvent();
  return {
    title: {
      default: event.name,
      template: `%s · ${event.name}`,
    },
    description: event.intro,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${josefin.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
