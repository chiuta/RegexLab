# Jurnal de modificări — RegexLab

## 2.2.0 — 2026-10-27 (anterior: 2.1.0)

- Nou: fragment Perl în fila Cod (delimitatori `m'…'` fără interpolare). Ajutorul menționează Perl în 7 limbi.
- Nou: `tests/codegen.test.mjs` rulează fragmentele generate în Python, PHP, Go, Java, Ruby și Perl cu interpretoarele reale și compară potrivirile cu motorul JS (117 verificări).
- Nu implementat: execuția reală PCRE/Python/RE2 în pagină (motoare WASM; planificat); fragment Rust și rularea C# (neverificabile aici).

## 2.1.0 — 2026-10-27 (anterior: 2.0.0)

- Nou: generare de cod pentru Java, C# și Ruby în fila Cod (testate: Java compilat, Ruby rulat).
- Nou: 7 modele în biblioteca de expresii frecvente (categoria „Dezvoltare & web”), în 8 limbi; testate pe exemple pozitive/negative.
- Textul de ajutor din aplicație actualizat (limbile de export).
- README: „Stare: stabil”, „Offline: complet”.
- Nu implementat: execuție reală PCRE/Python/RE2 (necesită motoare WASM — planificat); alerta ReDoS exista deja.
