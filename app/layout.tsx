import type { Metadata } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/app/lib/currency-context";

export const metadata: Metadata = {
  title: "Borderless Buy — Compare prices across 6 countries",
  description:
    "Find the best deals worldwide. Compare prices across countries and save money on your dream purchases. Add items to your wishlist instantly.",
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
      </body>
    </html>
  );
}
