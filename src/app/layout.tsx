import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "evalez | MVP local",
  description: "MVP local para informes de sitios web autorizados."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
