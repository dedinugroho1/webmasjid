import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/*/admin", "/superadmin", "/api/", "/masuk", "/undangan/", "/lupa-password", "/reset-password"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
