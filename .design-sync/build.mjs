// Pre-converter build for the Claude Design sync (cfg.buildCmd).
// 1. Compile Tailwind over the app theme + synced components + previews.
// 2. Emit .d.ts for the synced slice (the app has no dist/ or shipped types),
//    rewriting the `@/` path alias to relative paths so the converter's
//    type checker can follow cross-file imports (CardStatus, CardRating, ...).
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pkg = join(here, "pkg");
const bin = (n) => join(root, ".ds-sync/node_modules/.bin", n);

execFileSync(bin("tailwindcss"), ["-i", join(here, "tailwind.css"), "-o", join(pkg, ".cache/tailwind.out.css")], { cwd: root, stdio: "inherit" });

const types = join(pkg, "types");
rmSync(types, { recursive: true, force: true });
execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(here, "tsconfig.dts.json")], { cwd: root, stdio: "inherit" });

const srcTypes = join(types, "src");
const walk = (d) => readdirSync(d).flatMap((n) => statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]);
for (const f of walk(types).filter((f) => f.endsWith(".d.ts"))) {
  const text = readFileSync(f, "utf8").replace(/(from\s+["'])@\/([^"']+)(["'])/g, (_, a, p, b) => {
    let rel = relative(dirname(f), join(srcTypes, p));
    if (!rel.startsWith(".")) rel = "./" + rel;
    return a + rel + b;
  });
  writeFileSync(f, text);
}
console.log("design-sync build: css + types ready");
