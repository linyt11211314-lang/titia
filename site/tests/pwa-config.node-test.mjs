import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PWA metadata and worker registration are deployment-base aware", async () => {
  const manifest = JSON.parse(await read("public/manifest.webmanifest"));
  const registration = await read("public/register-sw.js");
  const worker = await read("public/sw.js");

  assert.equal(manifest.id, "./");
  assert.equal(manifest.start_url, "./?source=pwa");
  assert.equal(manifest.scope, "./");
  assert.ok(manifest.icons.every((icon) => icon.src.startsWith("./")));
  assert.match(registration, /document\.baseURI/);
  assert.match(worker, /self\.registration\.scope/);
});

test("static hosts deploy dist without authentication redirects", async () => {
  const vercel = JSON.parse(await read("vercel.json"));
  const cloudflare = await read("public/_redirects");
  const github = await readFile(new URL("../../.github/workflows/pages.yml", import.meta.url), "utf8");

  assert.deepEqual(vercel.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
  assert.match(cloudflare, /^\/\* \/index\.html 200/m);
  assert.match(github, /actions\/deploy-pages@v4/);
  assert.match(github, /path: site\/dist/);
  assert.doesNotMatch(`${cloudflare}\n${github}`, /chatgpt|auth|login/i);
});
