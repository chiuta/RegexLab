// RegexLab — limite de lungime (pattern, text de test, înlocuire, teste) și fir principal nebloat.
// Rulare: node tests/limits.test.mjs [index.html]
import {createRequire} from "module"; import path from "path"; import {fileURLToPath} from "url";
const require = createRequire("/opt/node-tools/package.json"); const {chromium} = require("playwright");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = "file://" + path.resolve(process.argv[2] || path.join(HERE, "..", "index.html"));
let fails = 0, passes = 0; const check = (n, c, x) => { c ? (passes++, console.log("  ok  " + n)) : (fails++, console.log("FAIL  " + n + (x !== undefined ? "  -> " + JSON.stringify(x) : ""))); };
const b = await chromium.launch({executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"]});
const LANGS = ["en", "ro", "fr", "it", "es", "pt", "de", "hu"];
async function open(lang) {
  const ctx = await b.newContext({serviceWorkers: "block", viewport: {width: 1280, height: 900}}); await ctx.route(/^https?:/, r => r.abort());
  const p = await ctx.newPage(); p.__e = []; p.on("pageerror", e => p.__e.push(String(e))); await p.goto(FILE); await p.waitForTimeout(800);
  if (lang !== "en") { await p.selectOption("#langSel", lang); await p.waitForTimeout(200); }
  return {ctx, p};
}
const blockMs = (p, id, len, ev = "input") => p.evaluate(async ([id, len, ev]) => { const e = document.getElementById(id); const t0 = performance.now(); e.value = "a".repeat(len); e.dispatchEvent(new Event(ev, {bubbles: true})); await new Promise(r => setTimeout(r, 0)); return performance.now() - t0; }, [id, len, ev]);
{
  const {ctx, p} = await open("en");
  let ms = await blockMs(p, "pattern", 1_000_000);
  check("1. 1 MB în pattern: fir blocat < 500 ms (" + Math.round(ms) + " ms)", ms < 500, ms);
  check("1. pattern limitat", (await p.inputValue("#pattern")).length <= 10000, (await p.inputValue("#pattern")).length);
  check("1. mesaj de limită vizibil", await p.evaluate(() => { const m = document.getElementById("limitMsg"); return !!m && !m.hidden && m.textContent.length > 20 && getComputedStyle(m).display !== "none"; }));
  ms = await p.evaluate(async () => { const t0 = performance.now(); document.querySelector('#flags .flag[data-flag="g"]').click(); document.querySelector('#flags .flag[data-flag="g"]').click(); await new Promise(r => setTimeout(r, 0)); return performance.now() - t0; });
  check("2. comutare «g» după 1 MB: fir blocat < 500 ms (" + Math.round(ms) + " ms)", ms < 500, ms);
  ms = await blockMs(p, "subject", 1_000_000);
  check("3. 1 MB în textul de test: fir blocat < 1500 ms (" + Math.round(ms) + " ms)", ms < 1500, ms);
  check("3. text limitat", (await p.inputValue("#subject")).length <= 200000, (await p.inputValue("#subject")).length);
  ms = await blockMs(p, "replaceStr", 1_000_000);
  check("4. 1 MB în înlocuire: < 1500 ms (" + Math.round(ms) + " ms)", ms < 1500, ms);
  ms = await blockMs(p, "testsIn", 1_000_000);
  check("5. 1 MB în teste: < 1500 ms (" + Math.round(ms) + " ms)", ms < 1500, ms);
  await p.evaluate(() => { const e = document.getElementById("pattern"); e.value = "(\\d+)"; e.dispatchEvent(new Event("input", {bubbles: true})); const s = document.getElementById("subject"); s.value = "a1 b22 c333"; s.dispatchEvent(new Event("input", {bubbles: true})); const r = document.getElementById("replaceStr"); r.value = "$1"; r.dispatchEvent(new Event("input", {bubbles: true})); const t = document.getElementById("testsIn"); t.value = ""; t.dispatchEvent(new Event("input", {bubbles: true})); });
  await p.waitForTimeout(600);
  check("6. utilizare normală: 3 potriviri", (await p.textContent("#statMatches")).trim() === "3", await p.textContent("#statMatches"));
  check("6. mesajul de limită dispare", await p.evaluate(() => { const m = document.getElementById("limitMsg"); return !m || m.hidden || !m.textContent; }));
  check("0 erori JS", p.__e.length === 0, p.__e);
  await ctx.close();
}
const seen = new Set();
for (const l of LANGS) {
  const {ctx, p} = await open(l);
  await blockMs(p, "pattern", 20000);
  const m = await p.evaluate(() => { const e = document.getElementById("limitMsg"); return e ? e.textContent : ""; });
  seen.add(m); check("7. " + l + ": mesaj de limită (cu cifra 10000)", m.length > 20 && /10[ .,  ]?000/.test(m), m);
  await ctx.close();
}
check("7. 8 mesaje distincte", seen.size === 8, seen.size);
await b.close(); console.log(`\n${passes} reușite, ${fails} eșuate`); process.exit(fails ? 1 : 0);
