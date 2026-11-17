import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Generated once at build time (required by `output: "export"`).
export const dynamic = "force-static";

/** The public pages search engines should know about. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/login`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE.url}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE.url}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
