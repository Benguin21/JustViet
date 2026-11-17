/**
 * Works around a Next.js static-export bug on Windows.
 *
 * `next build` with `output: "export"` writes one small prefetch file per
 * page segment, meant to be named like `login/__next.login.__PAGE__.txt`.
 * Next builds the name from a relative path and only turns "/" into ".",
 * but on Windows that path uses "\" — so the file lands in a folder
 * instead: `login/__next.login/__PAGE__.txt`. The browser then asks for the
 * dotted name, gets a 404, and page-to-page navigation loses its prefetch
 * (still works, just slower). See `collectSegmentPathsImpl` /
 * `convertSegmentPathToStaticExportFilename` in next/dist.
 *
 * This flattens any such `__next.*` folders in `out/` back into the dotted
 * filenames. On macOS/Linux there are no such folders, so it does nothing.
 * Run after `next build` (the `deploy` script does).
 */
import { readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join, relative, sep, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "out");

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

let moved = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (entry.name.startsWith("__next.")) {
      for (const file of filesUnder(full)) {
        const flatName = `${entry.name}.${relative(full, file).split(sep).join(".")}`;
        renameSync(file, join(dir, flatName));
        moved++;
      }
      rmSync(full, { recursive: true, force: true });
    } else if (entry.name !== "_next") {
      walk(full);
    }
  }
}

try {
  statSync(outDir);
} catch {
  console.error(`No ${outDir} folder — run \`next build\` first.`);
  process.exit(1);
}
walk(outDir);
console.log(moved ? `Fixed ${moved} prefetch file name(s) in out/.` : "Prefetch file names already correct.");
