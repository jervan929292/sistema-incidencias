import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

<<<<<<< HEAD
// IMPORTANTE: Asegúrate de que esta ruta coincida con donde guardaste el archivo del banner.
// Si lo creaste dentro de una carpeta "components", esta línea está perfecta.
import BannerConcejo2026 from "@/components/BannerConcejo2026"; 

=======
>>>>>>> 5e8bb4fa981229dc3d4db1c4842f0a107d038b13
const geistSans = Geist({
  variable: "--font-geist-sans", // Corregí un pequeño doble guion que tenías aquí antes
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
      {/* SE AGREGÓ EL SUPPRESSHYDRATIONWARNING AQUÍ TAMBIÉN */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
<<<<<<< HEAD
        
        {/* AQUÍ COLGAMOS EL CARTEL PUBLICITARIO GLOBAL */}
        <BannerConcejo2026 />

        {/* Aquí sigue el resto de tu sistema intacto hacia abajo */}
        {children}
        
=======
        {children}
>>>>>>> 5e8bb4fa981229dc3d4db1c4842f0a107d038b13
      </body>
    </html>
  );
}