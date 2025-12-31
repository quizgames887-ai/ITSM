import type { Metadata } from "next";
import { Merriweather, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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
  title: "Ticketing System",
  description: "Modern ticketing system with AI-powered assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${merriweather.variable} ${lora.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
