import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://marketplace-arqui.vercel.app";
  const today = new Date();

  return [
    {
      url: appUrl,
      lastModified: today,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${appUrl}/acceder`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${appUrl}/panel`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];
}
