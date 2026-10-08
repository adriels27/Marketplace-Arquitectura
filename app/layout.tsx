import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./moderation.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://marketplace-arqui.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Marketplace Arqui",
    template: "%s | Marketplace Arqui",
  },
  description: "Compra y vende artículos de segunda mano con seguridad, pagos verificados y comunidad de confianza.",
  keywords: ["marketplace", "compra y venta", "productos usados", "seguridad", "vendedores"],
  openGraph: {
    title: "Marketplace Arqui",
    description: "Marketplace seguro para comprar y vender productos entre personas.",
    url: appUrl,
    siteName: "Marketplace Arqui",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketplace Arqui",
    description: "Compra y vende con confianza en la comunidad de Marketplace Arqui.",
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#126b4d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#main-content">Saltar al contenido</a>
        {children}
      </body>
    </html>
  );
}
