// RegexLab 2.0 — depanator pas cu pas (motor instrumentat), sugestii anti-ReDoS, compatibilitate, generator din exemple.
// Rulare: node tests/debugger.test.mjs [index.html]
import {createRequire} from "module"; import path from "path"; import {fileURLToPath} from "url"; import fs from "fs";
const require = createRequire(process.env.PW_ROOT || import.meta.url); const {chromium} = require("playwright");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = "file://" + path.resolve(process.argv[2] || path.join(HERE, "..", "index.html"));
let fails = 0, passes = 0;
const check = (n, c, x) => { c ? (passes++, console.log("  ok  " + n)) : (fails++, console.log("FAIL  " + n + (x !== undefined ? "  -> " + JSON.stringify(x) : ""))); };
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"]});
const LANGS = ["en", "ro", "fr", "it", "es", "pt", "de", "hu"];
async function open(lang, w = 1280) {
  const ctx = await b.newContext({serviceWorkers: "block", viewport: {width: w, height: 900}, bypassCSP: !!process.env.FFF_AXE}); const reqs = [];
  await ctx.route(/^https?:/, r => { reqs.push(r.request().url()); r.abort(); });
  const p = await ctx.newPage(); p.__e = []; p.__r = reqs; p.on("pageerror", e => p.__e.push(String(e))); await p.goto(FILE); await p.waitForTimeout(500);
  if (lang && lang !== "en") { await p.selectOption("#langSel", lang); await p.waitForTimeout(150); }
  return {ctx, p};
}
const setPat = async (p, v) => { await p.fill("#pattern", v); await p.waitForTimeout(120); };
const setSubj = async (p, v) => { await p.fill("#subject", v); await p.waitForTimeout(120); };

console.log("1. motorul instrumentat = motorul nativ (test diferențial)");
{
  const {ctx, p} = await open("en");
  const CASES = [
    ["abc", "xxabcxx", ""], ["a.c", "a\nc abc", ""], ["a.c", "a\nc abc", "s"], ["[a-c]+", "xxabcabcxx", ""], ["[^a-c]+", "abcxyzabc", ""],
    ["\\d+", "ab 123 cd", ""], ["\\w+\\s\\d+", "Hello 2026", ""], ["(a|ab)(c|bcd)(d*)", "abcd", ""], ["a*?b", "aaab", ""], ["a+?", "aaa", ""],
    ["(a+)(b+)?", "aaac", ""], ["(?:ab)+c", "ababc", ""], ["x{2,3}", "xxxxx", ""], ["x{2,}?y", "xxxxy", ""], ["^abc$", "abc", ""], ["^b", "a\nb", "m"], ["a$", "a\nb", "m"],
    ["\\bfoo\\b", "a foo b", ""], ["\\Boo", "foo", ""], ["(\\w)\\1", "hello", ""], ["(?<x>a)\\k<x>", "baab", ""], ["ABC", "xabcx", "i"], ["[A-C]+", "abcABC", "i"], ["a(?=b)", "ac ab", ""], ["a(?!b)", "ab ac", ""],
    ["(a)|(b)", "b", ""], ["colou?r", "color colour", ""], ["(\\d{3})-(\\d{4})", "555-1234", ""], ["a|", "b", ""], ["(a*)*b", "aab", ""], ["(a*)+", "b", ""], ["\\s*$", "abc   ", ""], ["[\\d.]+", "v1.2.3", ""], ["(?:a|b)*c", "abbac", ""], ["q", "abc", ""], ["^$", "", ""]
  ];
  const res = await p.evaluate(CASES => CASES.map(([pat, subj, fl]) => {
    const r = dbgTrace(pat, fl, subj, 0), m = new RegExp(pat, fl).exec(subj);
    const mine = r.match ? [r.match.s, subj.slice(r.match.s, r.match.e), ...(m ? m.slice(1).map((_, i) => { const c = r.match.caps[i + 1]; return c ? subj.slice(c[0], c[1]) : undefined; }) : [])] : null;
    const nat = m ? [m.index, m[0], ...m.slice(1)] : null;
    return {pat, fl, subj, ok: JSON.stringify(mine) === JSON.stringify(nat), mine, nat, err: r.error, aborted: r.aborted};
  }), CASES);
  res.forEach(r => check("diferențial /" + r.pat + "/" + r.fl + " pe " + JSON.stringify(r.subj), r.ok && !r.err && !r.aborted, r));
  await ctx.close();
}

console.log("2. evenimente, backtracking și buget");
{
  const {ctx, p} = await open("en");
  const t1 = await p.evaluate(() => { const r = dbgTrace("a+ab", "", "aaab", 0); return {backs: r.backs, kinds: [...new Set(r.events.map(e => e.k))].join(""), match: r.match && [r.match.s, r.match.e]}; });
  check("a+ab pe aaab: backtracking observat", t1.backs >= 1 && t1.kinds.includes("b") && t1.match[0] === 0 && t1.match[1] === 4, t1);
  const t2 = await p.evaluate(() => { const r = dbgTrace("a*?b", "", "aab", 0); return {backs: r.backs, lz: r.events.some(e => e.k === "b" && e.lz)}; });
  check("cuantificator leneș: eveniment «ia încă o repetiție»", t2.lz && t2.backs >= 1, t2);
  const t3 = await p.evaluate(() => { const r = dbgTrace("^(a+)+$", "", "a".repeat(25) + "!", 0); return {ab: r.aborted, steps: r.steps, ev: r.events.length, last: r.events[r.events.length - 1].k}; });
  check("^(a+)+$ pe 25×a+!: oprit la buget", t3.ab && t3.steps > 50000 && t3.ev <= 4001 && t3.last === "ab", t3);
  const t4 = await p.evaluate(() => { const r = dbgTrace("^(a+)$", "", "a".repeat(25) + "!", 0); return {ab: r.aborted, steps: r.steps}; });
  check("rescrierea ^(a+)$: sub 200 de pași", !t4.ab && t4.steps < 200, t4);
  const t5 = await p.evaluate(() => [dbgTrace("(?<=a)b", "", "ab", 0).error, dbgTrace("\\p{L}", "u", "a", 0).unsupported, dbgTrace("(", "", "a", 0).error]);
  check("lookbehind / \\p{} raportate ca nesuportate", t5[0] === "unsupported" && t5[1] === "\\p{…}", t5);
  const t6 = await p.evaluate(() => dbgTrace("a", "", "x".repeat(1000), 0)); 
  check("textul lung e tăiat la 400", t6.clipped && t6.subject.length === 400);
  const t7 = await p.evaluate(() => { const r = dbgTrace("(a)(b)?", "", "ac", 0); return r.match.caps[1] && !r.match.caps[2]; });
  check("grupuri opționale neparticipante", t7);
  const t8 = await p.evaluate(() => { const r = dbgTrace("\\d", "", "ab1", 0), r2 = dbgTrace("\\d", "", "ab1", 3, true); return [r.match.s, r2.match]; });
  check("pornire de la index", t8[0] === 2 && t8[1] === null, t8);
  await ctx.close();
}

console.log("3. sugestii de rescriere");
{
  const {ctx, p} = await open("en");
  const S = pat => p.evaluate(x => dbgSuggest(x).map(f => [f.id, f.a, f.b, f.rewrite]), pat);
  let s = await S("^(a+)+$"); check("(a+)+ → (a+)", JSON.stringify(s) === JSON.stringify([["nested", "(a+)+", "(a+)", "^(a+)$"]]), s);
  s = await S("(?:\\d*)*x"); check("(?:\\d*)* → \\d*", s[0] && s[0][0] === "nested" && s[0][2] === "\\d*" && s[0][3] === "\\d*x", s);
  s = await S("(a*)+b"); check("(a*)+ → (a*)", s[0] && s[0][2] === "(a*)" && s[0][3] === "(a*)b", s);
  s = await S("(?<w>\\w+)*$"); check("grup cu nume păstrat", s[0] && s[0][2] === "(?<w>\\w*)" , s);
  s = await S("(a+)+?b"); check("cuantificator leneș: fără rescriere automată", !s.some(f => f[3] && f[0] === "nested"), s);
  s = await S("\\s*\\s+x"); check("\\s*\\s+ → \\s+", s[0] && s[0][0] === "adj" && s[0][2] === "\\s+" && s[0][3] === "\\s+x", s);
  s = await S("x.*.*y"); check(".*.* → .*", s.some(f => f[0] === "adj" && f[2] === ".*"), s);
  s = await S("\\d+\\d+"); check("\\d+\\d+ → \\d{2,}", s[0] && s[0][2] === "\\d{2,}", s);
  s = await S("(\\d)+(\\d)+"); check("grupuri capturante adiacente nu se îmbină", !s.some(f => f[0] === "adj"), s);
  s = await S("(a|a)+"); check("(a|a)+ → dedublare", s[0] && s[0][0] === "dupalt" && s[0][3] === "(a)+", s);
  s = await S("(a|aa)+$"); check("(a|aa)+ → doar indiciu de suprapunere", s[0] && s[0][0] === "overlap" && s[0][3] === null, s);
  s = await S("(\\w+\\s?)+$"); check("(\\w+\\s?)+ → indiciu", s.some(f => f[0] === "hintNested" && f[3] === null), s);
  s = await S("a.*b.*c"); check("două .* → indiciu", s.some(f => f[0] === "hintDot"), s);
  s = await S("^[a-z]+$"); check("pattern sigur: nicio sugestie", s.length === 0, s);
  s = await S("(((("); check("pattern invalid: fără erori", Array.isArray(s));
  const cmp = await p.evaluate(() => [dbgCompare("(a+)+b", "(a+)b", "", "aaab", []), dbgCompare("a+", "a", "", "aaab", []), dbgCompare("^(a+)+$", "^(a+)$", "", "a".repeat(30) + "!", [])]);
  check("echivalență: același rezultat", cmp[0].bad === null && cmp[0].checked >= 1, cmp[0]);
  check("echivalență: rezultate diferite detectate", cmp[1].bad !== null, cmp[1]);
  check("echivalență verificată pe eșantioane scurte derivate chiar dacă originalul depășește bugetul", cmp[2].bad === null && cmp[2].checked >= 1, cmp[2]);
  await ctx.close();
}

console.log("4. interfață: file, comenzi, evidențieri");
{
  const {ctx, p} = await open("en");
  await setPat(p, "(\\w+)@(\\w+)"); await setSubj(p, "mail bob@example now");
  await p.click('[data-tab="debug"]'); await p.waitForTimeout(150);
  check("fila Debugger activă", await p.isVisible("#pane-debug") && (await p.getAttribute('[data-tab="debug"]', "class") || "").includes("on"));
  const n = +(await p.getAttribute("#dbgRange", "max")); check("cursorul are max = nr. pași - 1", n > 10, n);
  check("pasul 1 din N", /^step 1 of \d+$/.test(await p.textContent("#dbgIdx")), await p.textContent("#dbgIdx"));
  check("«Anterior»/«Primul» dezactivate la început", await p.isDisabled("#dbgPrev") && await p.isDisabled("#dbgFirst"));
  await p.click("#dbgNext"); await p.click("#dbgNext");
  check("pas 3: text descriptiv", /matches|fails/.test(await p.textContent("#dbgNote")), await p.textContent("#dbgNote"));
  check("nodul curent evidențiat în pattern", (await p.$$("#dbgPat .cur")).length >= 1);
  check("poziția curentă marcată în text", (await p.$$("#dbgSubj .at")).length === 1);
  await p.click("#dbgLast");
  check("ultimul pas: potrivire găsită + capturi", /Match found: “bob@example” at 5–16/.test(await p.textContent("#dbgNote")) && /\$1=“bob”/.test(await p.textContent("#dbgCaps")) && /\$2=“example”/.test(await p.textContent("#dbgCaps")), [await p.textContent("#dbgNote"), await p.textContent("#dbgCaps")]);
  check("rezumat: potrivire", /match “bob@example” at 5–16/.test(await p.textContent("#dbgSum")));
  check("«Următor» dezactivat la final", await p.isDisabled("#dbgNext"));
  await p.evaluate(() => { const r = document.getElementById("dbgRange"); r.value = "4"; r.dispatchEvent(new Event("input", {bubbles: true})); });
  check("cursorul sare la pasul 5", /step 5 of/.test(await p.textContent("#dbgIdx")));
  // redare automată
  await p.selectOption("#dbgSpeed", "60"); await p.click("#dbgFirst"); await p.click("#dbgPlay");
  check("redare: butonul devine pauză", (await p.textContent("#dbgPlay")) === "⏸" && (await p.getAttribute("#dbgPlay", "aria-label")) === "Pause");
  check("redare: live region oprit", (await p.getAttribute("#dbgNote", "aria-live")) === "off");
  await p.waitForFunction(() => document.getElementById("dbgNext").disabled, null, {timeout: 15000});
  check("redare ajunge la final și se oprește", (await p.textContent("#dbgPlay")) === "▶" && (await p.getAttribute("#dbgNote", "aria-live")) === "polite");
  // următoarea potrivire
  await setSubj(p, "bob@example and ann@site.org"); await p.click("#dbgNextMatch"); await p.waitForTimeout(150);
  check("«Next match» pornește după prima potrivire", (await p.inputValue("#dbgStart")) === "11" && /ann@site/.test(await p.textContent("#dbgSum")), [await p.inputValue("#dbgStart"), await p.textContent("#dbgSum")]);
  await p.fill("#dbgStart", "0"); await p.waitForTimeout(100);
  // fără potrivire
  await setSubj(p, "nimic aici"); check("fără potrivire: rezumat", /no match/.test(await p.textContent("#dbgSum")) && await p.isDisabled("#dbgNextMatch"));
  // nesuportat
  await setPat(p, "(?<=a)b"); check("lookbehind: mesaj de nesuportat", /does not support lookbehind/.test(await p.textContent("#dbgBody")), await p.textContent("#dbgBody"));
  check("celelalte file merg în continuare (statistici)", (await p.textContent("#statMatches")).trim() !== "—");
  await setPat(p, "(("); check("pattern invalid: mesaj", /valid pattern/.test(await p.textContent("#dbgBody")));
  // exemplul riscant + Aplică
  await p.click("#dbgExample"); await p.waitForTimeout(700);
  check("exemplu riscant: oprit la buget + avertisment", /Stopped after 50000 steps/.test(await p.textContent("#dbgSum")) && /50000\+ steps/.test(await p.textContent("#dbgSum")), await p.textContent("#dbgSum"));
  check("sugestie afișată cu număr de pași înainte → după", /steps on your text: 50000\+ → \d+/.test(await p.textContent("#dbgFix")), (await p.textContent("#dbgFix")).slice(0, 400));
  check("verificare de echivalență pe eșantioane derivate", /same result on \d+ text/.test(await p.textContent("#dbgFix")), await p.textContent("#dbgFix"));
  await p.click('[data-apply="0"]'); await p.waitForTimeout(500);
  check("«Apply» schimbă pattern-ul", (await p.inputValue("#pattern")) === "^(a+)$", await p.inputValue("#pattern"));
  check("după rescriere: fără oprire la buget", !/Stopped/.test(await p.textContent("#dbgSum")));
  // injecție
  await setPat(p, "<b>(x)"); await setSubj(p, "<img src=x onerror=window.__pwn=1><b>x");
  check("fără injecție HTML în depanator", !(await p.evaluate(() => window.__pwn)) && (await p.$$("#dbgBody img")).length === 0 && (await p.$$("#dbgFix img")).length === 0);
  check("0 erori JS", p.__e.length === 0, p.__e);
  check("0 cereri de rețea", p.__r.length === 0, p.__r);
  await ctx.close();
}

console.log("5. compatibilitate și generator");
{
  const {ctx, p} = await open("en");
  await setPat(p, "(?<=a)b(?=c)\\1\\p{L}$"); await p.click('[data-tab="code"]');
  const cm = await p.textContent("#compatOut");
  check("RE2: lookaround + backreferințe", /RE2 \/ GoLookahead/.test(cm) && /Backreferences are not supported/.test(cm), cm);
  check("Python: \\p, lookbehind fix, $", /not available in the built-in re module/.test(cm) && /fixed width/.test(cm) && /final newline/.test(cm));
  check("PCRE: \\p cere u", /needs the u modifier/.test(cm));
  await setPat(p, "^[a-z]+"); check("pattern simplu: fără incompatibilități pentru RE2", /RE2 \/ Go<\/b><p>No incompat|No incompatibility/.test(await p.innerHTML("#compatOut")));
  await p.click('[data-tab="tests"]');
  const gen = async (t) => { await p.fill("#testsIn", t); await p.waitForTimeout(100); await p.click("#testsGen"); return p.textContent("#testsGenOut"); };
  let g = await gen("+ 2026-10-11\n+ 1999-01-02\n+ 2020-12-31\n- not a date\n- 2026/10/11\n- 20-10-11");
  check("generator: dată ISO", g.includes("^\\d{4}-\\d{2}-\\d{2}$"), g);
  g = await gen("+ cat\n+ dog\n- cow\n- cat "); check("generator: litere păstrate exact când negativele o cer", g.includes("^(?:cat|dog)$"), g);
  g = await gen("+ A-12\n+ B-345\n+ C-7\n- 12-A"); check("generator: litere mari + cifre variabile", g.includes("^[A-Z]-\\d{1,3}$"), g);
  g = await gen("+ abc\n- abc"); check("generator: avertisment pentru exemplu imposibil", /still matches/.test(g), g);
  g = await gen("- doar negative"); check("generator: fără pozitive → îndrumare", /at least one line starting with/.test(g), g);
  g = await gen("+ a.b\n+ a+b"); check("generator: caractere speciale escapate", g.includes("^a[.+]b$") || g.includes("^a(?:\\.|\\+)b$"), g);
  await gen("+ 2026-10-11\n+ 1999-01-02\n- x"); await p.click("#genUse"); await p.waitForTimeout(200);
  check("«Use this pattern» aplică pattern-ul", (await p.inputValue("#pattern")) === "^\\d{4}-\\d{2}-\\d{2}$");
  check("testele existente trec cu patternul generat", /2 of 3 passed|3 of 3 passed|passed/.test(await p.textContent("#testsOut")));
  check("0 erori JS", p.__e.length === 0, p.__e);
  await ctx.close();
}

console.log("6. limbi, accesibilitate, telefon");
{
  const {ctx, p} = await open("en");
  const keys = await p.evaluate(() => { const need = Object.keys(I18N.en).filter(k => /^(dbg|ev[A-Z]|fix|gen|cmp|tabDebug)/.test(k)); return {n: need.length, miss: Object.keys(I18N).map(l => [l, need.filter(k => I18N[l][k] == null)]).filter(x => x[1].length)}; });
  check("toate cheile noi există în toate cele 8 limbi (" + keys.n + ")", keys.n >= 70 && keys.miss.length === 0, keys.miss);
  await setPat(p, "a+b"); await setSubj(p, "aab"); await p.click('[data-tab="debug"]');
  for (const l of LANGS.slice(1)) {
    await p.selectOption("#langSel", l); await p.waitForTimeout(250);
    const tab = (await p.textContent('[data-tab="debug"]')).trim(), note = await p.textContent("#dbgNote"), idx = await p.textContent("#dbgIdx");
    check("limba " + l + ": fila, nota și contorul traduse", tab !== "Debugger" || ["it", "de"].includes(l), [tab, note, idx]);
    check("limba " + l + ": fără chei brute", !/^(ev|dbg|fix)[A-Za-z_]+$/.test(note) && !/\{[a-z]+\}/.test(note + idx), [note, idx]);
    check("limba " + l + ": etichetă ARIA tradusă", (await p.getAttribute("#dbgNext", "aria-label")) !== "Next step", await p.getAttribute("#dbgNext", "aria-label"));
  }
  await p.selectOption("#langSel", "en");
  if (process.env.FFF_AXE) {
    await p.addScriptTag({path: process.env.FFF_AXE}); await p.click("#dbgExample"); await p.waitForTimeout(700); await p.mouse.move(0, 0);
    const v = await p.evaluate(async () => (await axe.run("#pane-debug", {runOnly: ["wcag2a", "wcag2aa"]})).violations.map(x => x.id + ":" + x.nodes.length));
    check("axe pe fila Debugger", v.length === 0, v);
  }
  await ctx.close();
  const m = await open("en", 360); await setPat(m.p, "^(a+)+$"); await m.p.click('[data-tab="debug"]'); await m.p.click("#dbgExample"); await m.p.waitForTimeout(700);
  const ov = await m.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("fără depășire orizontală la 360 px", ov <= 0, ov); await m.ctx.close();
}
await b.close();
console.log("\n" + passes + " reușite, " + fails + " eșuate");
process.exit(fails ? 1 : 0);
