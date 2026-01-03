import type { Metadata } from "next";
import { Merriweather, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LanguageProvider } from "@/components/LanguageProvider";

const merriweather = Merriweather({
  weight: ["300", "400", "700"],
  variable: "--font-serif",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-serif-alt",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Palmware",
  description: "Modern ticketing system with AI-powered assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body
        className={`${merriweather.variable} ${lora.variable} antialiased`}
      >
        <LanguageProvider>
          <Providers>{children}</Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}
