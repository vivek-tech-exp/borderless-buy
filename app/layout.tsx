import type { Metadata } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/app/lib/currency-context";
import { ThemeProvider } from "@/app/lib/theme-context";

export const metadata: Metadata = {
  title: "Life Upgrade Manager - The Material Wishlist",
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
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased transition-colors duration-300">
        <ThemeProvider>
          <CurrencyProvider>{children}</CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
