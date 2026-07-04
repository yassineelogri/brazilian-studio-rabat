import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/espace-client/", "/login", "/api/"],
    },
    sitemap: "https://brazilian-studio-rabat.vercel.app/sitemap.xml",
  };
}
