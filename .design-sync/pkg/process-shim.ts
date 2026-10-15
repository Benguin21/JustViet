// next/link reads process.env.__NEXT_* flags at module scope; outside Next's
// bundler there is no `process`, so give the browser bundle an empty one.
const g = globalThis as { process?: { env: Record<string, string | undefined> } };
g.process ??= { env: { NODE_ENV: "production" } };
export {};
