import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import "./globals.css";

const serif = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "LibroYa — Librería virtual",
  description:
    "Compra libros físicos con envío a domicilio. Catálogo, carrito y seguimiento de pedidos en tiempo real.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${serif.variable} ${sans.variable} font-sans antialiased`}>
        <Providers>
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
