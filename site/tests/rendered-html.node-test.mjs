import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("static build contains the login-free Titia application shell", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Titia 时序<\/title>/);
  assert.match(html, /id="root"/);
  assert.match(html, /manifest\.webmanifest/);
  assert.doesNotMatch(html, /chatgpt|auth|sign[ -]?in|login/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Building your site/);
});

