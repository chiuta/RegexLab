// RegexLab — conformanță a snippet-urilor din fila Cod: fiecare fragment generat este rulat cu interpretorul/compilatorul REAL
// (python3, php, go, java, ruby, perl) și lista de potriviri se compară cu cea a motorului JavaScript din pagină.
// Limite: verifică doar cazurile de mai jos și doar limbajele instalate (cele lipsă sunt omise cu mesaj); C# și Rust nu pot fi rulate aici.
// Rulare: node tests/codegen.test.mjs
import {createRequire} from "module"; import path from "path"; import fs from "fs"; import os from "os"; import {fileURLToPath} from "url"; import {spawnSync} from "child_process";
const require = createRequire(process.env.PW_ROOT || import.meta.url); const {chromium} = require("playwright");
const HERE = path.dirname(fileURLToPath(import.meta.url)); const FILE = "file://" + path.resolve(HERE, "..", "index.html");
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log("  FAIL", m, x === undefined ? "" : JSON.stringify(x).slice(0, 300)); } };
const have = c => spawnSync("sh", ["-c", "command -v " + c]).status === 0;
const SEP = "\u001f";
const CASES = [
  {n: "e-mail", re: "\\b\\w+@\\w+\\.\\w+\\b", fl: "gi", text: "Mail a@b.co and X@Y.ORG now; bad@host and 'q'@z.ro"},
  {n: "grupuri", re: "(\\d{4})-(\\d{2})-(\\d{2})", fl: "g", text: "2026-10-27, 1999-01-02 and 12-34-56"},
  {n: "ancore multiline", re: "^\\s*#.*$", fl: "gm", text: "# one\ncode\n  # two\nx # not\n#three"},
  {n: "dolar în alternanță", re: "(?:end$|start)", fl: "g", text: "start middle end"},
  {n: "backreferință numită", re: "(?<w>\\b\\w+\\b)\\s+\\k<w>", fl: "gi", text: "this is is a test Test test and and", noGo: true},
  {n: "lookbehind", re: "(?<=\\$)\\d+(?:\\.\\d+)?", fl: "g", text: "cost $12.50 and $7, not 9", noGo: true},
  {n: "culoare", re: "colou?r", fl: "gi", text: "Color colour COLOUR colr"},
  {n: "punct + s", re: "a.c", fl: "gs", text: "a\nc abc a c", noRuby: false},
  {n: "apostrof în pattern", re: "it's|'x'", fl: "g", text: "it's 'x' its"},
];
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"]});
const ctx = await browser.newContext({serviceWorkers: "block"}); await ctx.route(/^https?:/, r => r.abort());
const page = await ctx.newPage(); const errs = []; page.on("pageerror", e => errs.push(String(e)));
await page.goto(FILE); await page.waitForTimeout(600);
// snippet-urile se citesc din fila „Cod” a paginii (funcția codeSnippets nu este globală)
async function getSnips(re, fl) {
  await page.evaluate(([re, fl]) => {
    const e = document.getElementById("pattern"); e.value = re; e.dispatchEvent(new Event("input", {bubbles: true}));
    document.querySelectorAll("#flags .flag").forEach(b => { const want = fl.includes(b.dataset.flag); if (b.classList.contains("on") !== want) b.click(); });
    document.querySelector('#tabs button[data-tab="code"]').click();
  }, [re, fl]);
  await page.waitForTimeout(150);
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#codeOut .code-block")].map(b => [b.querySelector(".cl").textContent, b.querySelector("pre").textContent])));
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rlcg-"));
function run(cmd, args, opt = {}) { const r = spawnSync(cmd, args, Object.assign({encoding: "utf8", timeout: 60000, cwd: tmp}, opt)); return r; }
const RUN = {
  Python: (sn, tf) => { const L = sn.split("\n"); fs.writeFileSync(tmp + "/t.py", `import sys\ntext=open(${JSON.stringify(tf)},encoding='utf-8').read()\n${L[0]}\n${L[1]}\nsys.stdout.write(''.join(m.group(0)+'\\x1f' for m in pat.finditer(text)))\n`); return run("python3", [tmp + "/t.py"]); },
  PHP: (sn, tf) => { const L = sn.split("\n"); fs.writeFileSync(tmp + "/t.php", `<?php\n$text=file_get_contents(${JSON.stringify(tf)});\n${L[0]}\npreg_match_all($re,$text,$mm);\necho implode("\\x1f",$mm[0]).(count($mm[0])?"\\x1f":"");\n`); return run("php", [tmp + "/t.php"]); },
  Go: (sn, tf) => { const L = sn.split("\n"); fs.writeFileSync(tmp + "/t.go", `package main\nimport ("fmt";"os";"regexp")\nfunc main(){\nb,_:=os.ReadFile(${JSON.stringify(tf)}); text:=string(b)\n${L[0]}\nfor _,m:=range re.FindAllString(text,-1){fmt.Print(m+"\\x1f")}\n}\n`); return run("go", ["run", tmp + "/t.go"], {env: Object.assign({}, process.env, {GO111MODULE: "off"}), timeout: 400000}   /* prima compilare a bibliotecii standard poate dura ~2 min; apoi folosește cache-ul implicit Go */); },
  Java: (sn, tf) => { const L = sn.split("\n"); fs.writeFileSync(tmp + "/T.java", `import java.nio.file.*;\n${L[0]}\npublic class T{public static void main(String[] a)throws Exception{String text=Files.readString(Path.of(${JSON.stringify(tf)}));\n${L[1]}\nMatcher m=p.matcher(text);StringBuilder sb=new StringBuilder();while(m.find()){sb.append(m.group()).append('\\u001f');}System.out.print(sb);}}\n`); const c = run("javac", ["-encoding", "UTF-8", tmp + "/T.java"]); return c.status ? c : run("java", ["-cp", tmp, "T"]); },
  Ruby: (sn, tf) => { const L = sn.split("\n"); fs.writeFileSync(tmp + "/t.rb", `text=File.read(${JSON.stringify(tf)},encoding:'UTF-8')\n${L[0]}\nprint text.to_enum(:scan,re).map{Regexp.last_match[0]+"\\x1f"}.join\n`); return run("ruby", [tmp + "/t.rb"]); },
  Perl: (sn, tf) => { fs.writeFileSync(tmp + "/t.pl", `use utf8; binmode(STDOUT,':utf8'); open(my $f,'<:encoding(UTF-8)',${JSON.stringify(tf)}) or die; local $/; my $text=<$f>;\n${sn.replace(/print "\$&\\n";/, () => 'print "$&\\x1f";')}\n`); return run("perl", [tmp + "/t.pl"]); },
};
const ALLTOOLS = {Python: "python3", PHP: "php", Go: "go", Java: "javac", Ruby: "ruby", Perl: "perl"};
const ONLY = process.env.CG_ONLY ? process.env.CG_ONLY.split(",") : Object.keys(ALLTOOLS);   // ex.: CG_ONLY=Python,Perl
const tools = Object.fromEntries(Object.entries(ALLTOOLS).filter(([k]) => ONLY.includes(k)));
for (const [lang, bin] of Object.entries(tools)) if (!have(bin)) console.log("  (omis: " + bin + " nu este instalat)");
let ran = 0;
for (const c of CASES) {
  const exp = await page.evaluate(([re, fl, text]) => [...text.matchAll(new RegExp(re, fl))].map(m => m[0]).join("\u001f") + (new RegExp(re, fl).test(text) ? "\u001f" : ""), [c.re, c.fl, c.text]);
  const snips = await getSnips(c.re, c.fl);
  const tf = tmp + "/text.txt"; fs.writeFileSync(tf, c.text, "utf8");
  ok(typeof snips.Perl === "string" && /^while \(\$text =~ m'/.test(snips.Perl), c.n + ": snippet Perl generat");
  for (const [lang, bin] of Object.entries(tools)) {
    if (lang === "Go" && c.noGo) { ok(/will not compile/.test(snips.Go), c.n + " [Go]: snippetul avertizează că RE2 nu compilează (lookaround/backreferință)"); continue; }
    if (!have(bin)) continue;
    const r = RUN[lang](snips[lang], tf); ran++;
    ok(r.status === 0, c.n + " [" + lang + "]: rulează fără eroare", (r.stderr || "").slice(0, 200));
    if (r.status === 0) ok(r.stdout === exp, c.n + " [" + lang + "]: aceleași potriviri ca JS", {got: r.stdout, exp});
  }
}
ok(ran > 0, "cel puțin un limbaj a rulat");
ok(errs.length === 0, "fără erori JS", errs);
await browser.close(); fs.rmSync(tmp, {recursive: true, force: true});
console.log(`\n${pass} reușite, ${fail} eșuate (${ran} execuții reale)`); process.exit(fail ? 1 : 0);
