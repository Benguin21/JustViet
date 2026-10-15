// Builds the code half of the JustViet Design System Artifact (claude.ai):
// components/bundle.js, bundle.css, index.d.ts and one preview.html per
// authored preview. Run after `node .design-sync/build.mjs` (needs .ds-sync/
// staged for esbuild). Output: .design-sync/.cache/artifact/project/components/
import { build } from "../.ds-sync/node_modules/esbuild/lib/main.js";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const out = join(here, ".cache/artifact/project/components");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The preview frame preloads React 18 UMD as window.React / window.ReactDOM.
const JSX_SHIM =
  "var R=window.React;function j(t,p,k){var q=Object.assign({},p);if(k!==undefined)q.key=k;return R.createElement(t,q)}" +
  "module.exports={jsx:j,jsxs:j,jsxDEV:j,Fragment:R.Fragment};";
const globals = (extra = {}) => ({
  name: "globals",
  setup(b) {
    const map = { react: "module.exports=window.React;", "react-dom": "module.exports=window.ReactDOM;",
      "react-dom/client": "module.exports=window.ReactDOM;", "react/jsx-runtime": JSX_SHIM,
      "react/jsx-dev-runtime": JSX_SHIM, ...extra };
    const rx = new RegExp(`^(${Object.keys(map).map((k) => k.replace(/[/.-]/g, "\\$&")).join("|")})$`);
    b.onResolve({ filter: rx }, (a) => ({ path: a.path, namespace: "g" }));
    b.onLoad({ filter: /.*/, namespace: "g" }, (a) => ({ contents: map[a.path], loader: "js" }));
  },
});
const common = { bundle: true, format: "iife", minify: true, write: false, target: "es2018",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error" };
const safe = (s, where) => {
  if (/<\/script|<!--/i.test(s)) throw new Error(`${where}: contains </script or <!--`);
  return s;
};

// 1. bundle.js
const names = [...readFileSync(join(here, "pkg/index.ts"), "utf8").matchAll(/export \{ (\w+) \}/g)].map((m) => m[1]);
const bundle = await build({ ...common, entryPoints: [join(here, "pkg/index.ts")], globalName: "JustViet",
  tsconfig: join(root, "tsconfig.json"), plugins: [globals()] });
const header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: "JustViet", components: names.map((name) => ({ name })) })} */\n`;
writeFileSync(join(out, "bundle.js"), header + safe(bundle.outputFiles[0].text, "bundle.js"));

// 2. bundle.css: Google-hosted fonts + compiled Tailwind. The app's own :root
// token block moves into @layer base so the page's tokens.css (unlayered) wins.
let css = readFileSync(join(here, "pkg/.cache/tailwind.out.css"), "utf8");
css = css.replace(/^:root \{[\s\S]*?^\}/gm, (blk) => `@layer base {\n${blk}\n}`);
const fonts = '@import url("https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&display=swap");\n';
if (/<\/style/i.test(css)) throw new Error("bundle.css contains </style");
writeFileSync(join(out, "bundle.css"), fonts + css);

// 3. index.d.ts from the converter's per-component .d.ts (ds-bundle/)
const dsComps = join(root, "ds-bundle/components");
let dts = "import * as React from 'react';\n\n";
for (const g of readdirSync(dsComps)) for (const n of readdirSync(join(dsComps, g))) {
  const t = readFileSync(join(dsComps, g, n, `${n}.d.ts`), "utf8");
  dts += t.replace(/^import .*\n/gm, "").replace(/ — from justviet-app@[\d.]+\./, "").trim() + "\n\n";
}
writeFileSync(join(out, "index.d.ts"), dts.replace(/CSSProperties/g, "React.CSSProperties"));

// 4. previews: every named export of .design-sync/previews/<Name>.tsx, labeled.
const meta = JSON.parse(readFileSync(join(here, "artifact-cards.json"), "utf8"));
for (const f of readdirSync(join(here, "previews")).filter((f) => f.endsWith(".tsx"))) {
  const name = f.replace(/\.tsx$/, "");
  const entry = `import * as S from ${JSON.stringify(join(here, "previews", f))};
var h = window.React.createElement;
var cells = Object.keys(S).map(function (k) {
  return h("div", { key: k, className: "flex flex-col gap-2" },
    h("div", { className: "text-xs font-bold tracking-wide uppercase text-ink-500" }, k.replace(/([a-z])([A-Z])/g, "$1 $2")),
    h(S[k]));
});
window.ReactDOM.createRoot(document.getElementById("root")).render(h("div", { className: "flex flex-col gap-6" }, cells));`;
  const r = await build({ ...common, stdin: { contents: entry, resolveDir: here, loader: "tsx" },
    plugins: [globals({ "justviet-app": "module.exports=window.JustViet;" })] });
  const m = meta[name] ?? {};
  const html = `<!-- @dsCard group="${m.group ?? "Components"}" height=${m.height ?? 200} -->
<!doctype html>
<html>
<head><meta charset="utf-8"><title>${name} — preview</title>
<style>body{margin:0;padding:20px;background:var(--color-paper);color:var(--color-ink-900);font-family:var(--font-body),sans-serif}</style></head>
<body>
<div id="root"></div>
<script>${safe(r.outputFiles[0].text, name)}</script>
</body>
</html>
`;
  mkdirSync(join(out, name), { recursive: true });
  writeFileSync(join(out, name, "preview.html"), html);
}
console.log(`artifact build: ${names.length} components`);
