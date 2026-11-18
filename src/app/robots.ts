import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Generated once at build time (required by `output: "export"`).
export const dynamic = "force-static";

/**
 * The public marketing site (/, /privacy, /terms) is indexable; the study
 * app behind sign-in isn't (those pages only show a spinner or the login
 * screen to a crawler anyway). Community pages stay out too (they also
 * carry noindex); the public community guidelines live at /guidelines.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms", "/guidelines"],
      disallow: [
        "/home",
        "/vocab-srs",
        "/dictionary",
        "/goals",
        "/grammar",
        "/skills",
        "/community",
        "/settings",
        "/auth/",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
