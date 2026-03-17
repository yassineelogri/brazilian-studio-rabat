import type { Metadata } from "next";
import "./globals.css";
import CustomCursor from "@/components/CustomCursor";
import WhatsAppButton from "@/components/WhatsAppButton";

export const metadata: Metadata = {
  title: "Brazilian Studio Rabat | Premium Beauty Salon",
  description: "Experience luxury beauty treatments at Brazilian Studio Rabat. Specializing in Russian Manicure, Lissage Brésilien, and Lash Extensions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <CustomCursor />
        <WhatsAppButton />
        {children}
      </body>
    </html>
  );
}
