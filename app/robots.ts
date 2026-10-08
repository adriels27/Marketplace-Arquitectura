import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://marketplace-arqui.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
