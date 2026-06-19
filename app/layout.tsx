import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import BannerConcejo2026 from "@/components/BannerConcejo2026"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema VEN 911 - Falcón",
  description: "Panel de control y gestión de incidencias operativas.",
  icons: {
    icon: '/logo1.png', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        
        {/* CARTEL PUBLICITARIO GLOBAL */}
        <BannerConcejo2026 />

        {/* RESTO DEL SISTEMA */}
        <main className="flex-grow">
          {children}
        </main>
        
      </body>
    </html>
  );
}