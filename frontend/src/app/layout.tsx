import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { TelegramInit } from "@/components/TelegramInit";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Я УБЕРУ — Сервис выноса мусора",
  description: "Удобный сервис по выносу мусора от двери",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive" 
        />
        <TelegramInit />
        {children}
      </body>
    </html>
  );
}
