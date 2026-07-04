import type { Metadata } from "next";
import "./globals.css";
import CustomCursor from "@/components/CustomCursor";
import WhatsAppButton from "@/components/WhatsAppButton";

const SITE_URL = "https://brazilian-studio-rabat.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Brazilian Studio Rabat | Salon de Beauté Premium à Agdal",
    template: "%s | Brazilian Studio Rabat",
  },
  description:
    "Salon de beauté premium à Rabat-Agdal : Manucure Russe, Lissage Brésilien, Extensions de Cils, soins visage et coiffure. Réservez en ligne.",
  keywords: [
    "salon de beauté Rabat",
    "manucure russe Rabat",
    "lissage brésilien Rabat",
    "extensions de cils Rabat",
    "salon Agdal",
    "Brazilian Studio",
  ],
  openGraph: {
    type: "website",
    locale: "fr_MA",
    url: SITE_URL,
    siteName: "Brazilian Studio Rabat",
    title: "Brazilian Studio Rabat | Salon de Beauté Premium à Agdal",
    description:
      "Manucure Russe, Lissage Brésilien, Extensions de Cils dans un cadre luxueux au cœur de Rabat-Agdal. Réservez en ligne.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Intérieur du salon Brazilian Studio à Rabat-Agdal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brazilian Studio Rabat | Salon de Beauté Premium à Agdal",
    description:
      "Manucure Russe, Lissage Brésilien, Extensions de Cils au cœur de Rabat-Agdal. Réservez en ligne.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  name: "Brazilian Studio by Ali K",
  image: `${SITE_URL}/og-image.jpg`,
  url: SITE_URL,
  telephone: "+212661215800",
  address: {
    "@type": "PostalAddress",
    streetAddress: "21 rue Oued Sbou, Agdal",
    addressLocality: "Rabat",
    addressCountry: "MA",
  },
  priceRange: "$$",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <CustomCursor />
        <WhatsAppButton />
        {children}
      </body>
    </html>
  );
}
