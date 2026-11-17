import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // JustViet is fully client-side (it talks to Firebase from the browser and
  // has no API routes or server rendering per request), so it's exported as
  // plain static files and served by Firebase Hosting on the free plan.
  // `next build` writes the site to `out/`; `npm run deploy` publishes it.
  // If server features are ever needed (e.g. payment webhooks), move to
  // Firebase App Hosting (Blaze plan) or add Cloud Functions instead.
  output: "export",
};

export default nextConfig;
