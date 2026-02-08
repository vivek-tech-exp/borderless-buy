import type { Metadata } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/app/lib/currency-context";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Borderless Buy — Compare prices across 6 countries",
  description:
    "Compare product prices across India, Nepal, USA, UAE Dubai, China & South Korea. Pick your currency and see where to buy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] font-sans antialiased">
        <CurrencyProvider>{children}</CurrencyProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
