import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/context/LanguageContext";
import PWARegister from "@/components/PWARegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "invoice.co.id - Premium Billing & Invoicing Platform",
  description: "Create professional invoices instantly with invoice.co.id. Easy, secure, and real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#004de6" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <LanguageProvider>
          <PWARegister />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

