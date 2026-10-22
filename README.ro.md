# RegexLab

[English](README.md) · **Română** · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Magyar](README.hu.md)

**Versiune:** 1.2.3 · **Ultima actualizare:** 2026-10-22

Limbile interfeței: **Română, English, Français, Italiano, Español, Português (PT), Deutsch, Magyar**

Laborator de expresii regulate: testare în timp real, explicații, înlocuire, fragmente de cod și bibliotecă de modele, într-un singur fișier HTML.

**Live:** https://chiuta.github.io/RegexLab/

![Captura de ecran](screenshot.ro.png)

## Ce este

RegexLab este un instrument pentru scrierea și testarea expresiilor regulate JavaScript direct în browser. Textul de test nu părăsește dispozitivul. Interfața are opt limbi (engleză, română, franceză, italiană, spaniolă, portugheză, germană, maghiară); limba implicită este engleza.

## Funcții

- Câmp pentru model (`/.../`), fanioane `g i m s u v y` (`u` și `v` se exclud reciproc), indicator de validitate („valid” / eroare), număr de potriviri și timp de execuție.
- Zona **Test string** cu evidențierea potrivirilor.
- Fila **Tests**: cazuri de test, un caz pe linie — `+ text` trebuie să se potrivească, `- text` nu; se afișează reușit/eșuat pe caz și totalul (evaluate în același Web Worker, cu aceeași limită de timp).
- Avertisment static (euristic) pentru cuantificatori imbricați, înainte de a se ajunge la timeout.
- Fragmentele de cod adaptează grupurile numite pentru Python/Go (`(?P<n>…)`) și adaugă note când sintaxa nu este disponibilă (Go: fără lookaround/backreferințe; Python: fără `\p{…}`; PHP: `\p{…}` cere modificatorul `u`).
- Șapte file: **Matches** (potriviri și grupuri), **Explanation** (explicarea modelului), **Replace** (înlocuire cu `$1`, `$2`, `$&`), **Code** (fragmente gata de lipit pentru JavaScript, Python, PHP și Go), **Library** (15 modele gata făcute, în opt limbi), **Tests** (cazuri de test) și **Reference** (fișă de referință).
- Evaluarea rulează într-un Web Worker, cu limită de timp de 1500 ms și mesaj de avertizare la posibil „catastrophic backtracking”.
- Butoane **Copy regex**, **Copy link** (permalink cu modelul, fanioanele, textul și înlocuirea în fragmentul `#` al URL-ului) și **Reset**.
- Temă luminoasă / întunecată (**Theme**), fereastră **About**.

## Manual de utilizare

1. Deschide pagina și alege limba din lista derulantă de limbi din antet.
2. Scrie modelul în câmpul de sus și bifează fanioanele dorite.
3. Lipește sau scrie textul în **Test string**; rezultatele apar imediat în fila **Matches**.
4. Deschide **Explanation** pentru o descompunere a modelului.
5. În **Replace**, scrie șablonul de înlocuire (`$1`, `$2`, `$&`) și citește rezultatul.
6. În **Code**, copiază fragmentul pentru limbajul dorit cu butonul ⧉.
7. În **Library**, apasă un model pentru a-l încărca; în **Reference** găsești sintaxa de bază.
8. **Copy link** creează un link cu starea curentă; **Reset** revine la exemplul implicit; **Esc** închide fereastra About.

## Confidențialitate și rețea

- **Stocare locală (localStorage):** șapte chei `regexlab-*`: `regexlab-pattern`, `regexlab-flags`, `regexlab-subject`, `regexlab-replace`, `regexlab-tests`, `regexlab-lang`, `regexlab-theme`. Rămân doar în browserul tău.
- **Rețea:** în cod nu există cereri de rețea, scripturi sau fonturi externe. Fereastra About conține linkuri (Buy Me a Coffee, site, contact) care se deschid doar la clic. Fără analytics sau telemetrie.
- Linkul creat cu **Copy link** include în URL modelul și textul de test; nu-l partaja dacă textul este sensibil.

## Rulare locală / offline

Descarcă `index.html` și deschide-l în browser; funcționează fără internet.

## Istoric / Changelog

### 1.2.3 — 2026-10-22
- Mobil: textul mic are acum minimum 12 px; butonul „copiază potrivirile” și linkul din subsol au ținte tactile mai mari (timeoutul ReDoS într-un Web Worker exista deja).

### 1.2.2 — 2026-10-22
- Etichetele câmpurilor și butoanelor pentru cititoarele de ecran (expresie regulată, text de test, înlocuire, teste, închide, limbă, temă) sunt acum traduse și se actualizează la schimbarea limbii.

### 1.2.1 — 2026-10-22
- Corecturi de traducere: titlul paginii și meta-etichetele urmează limba interfeței; texte rămase în limba greșită eliminate.

### 1.1.0 — 2026-10-14
- Copie de rezervă și etichetare date (fff-kit).

### 12 octombrie 2026 — versiunea 1.0.0
- 1.0.0 — 2026-10-12: versiunea și data ultimei actualizări sunt afișate în aplicație

### 11 octombrie 2026 (a treia trecere)
- Fanionul `v` (unicodeSets: operații pe mulțimi, ex. `[\p{L}--[a-z]]`); `u` și `v` se exclud reciproc, iar fragmentele Python/PHP îl tratează ca `u`. CSP: hash recalculat.

### 11 octombrie 2026 (a doua trecere)
- Filă **Tests** cu cazuri `+`/`-`; avertisment euristic pentru cuantificatori imbricați; fragmente Python/Go/PHP corectate pentru grupuri numite și cu note de compatibilitate; texte noi în cele 7 limbi. CSP: hash recalculat.

### 11 octombrie 2026
- Accesibilitate: conținutul principal este încadrat în `<main>` (antet și subsol rămân repere separate); axe-core raportează 0 încălcări la 1280 și 360 px.
- CSP: `script-src` folosește hash SHA-256 în loc de `'unsafe-inline'` (workerul din `blob:` rămâne permis); verificat cu CSP activ: potrivirile și workerul funcționează.

## Licență

MIT — vezi fișierul LICENSE.

## Audit

Audit: 2026-10-10 — afirmațiile din README (fără cereri de rețea, stocare doar în localStorage) corespund codului; fără `fetch`/CDN/WebSocket. Corecturi de contrast și ARIA.

## Autor

Alexio — Alexandru-Ionuț Chiuță. Contact: alexio@trom.tf

## Rezumat

RegexLab este un laborator de expresii regulate într-un singur fișier: potrivire în direct cu evidențiere, explicație, înlocuire, fragmente de cod (JavaScript, Python, PHP, Go), o bibliotecă de 15 modele și o fișă de referință, în 8 limbi de interfață. Potrivirea rulează într-un Web Worker cu limită de 1,5 s. Starea se păstrează în localStorage; fără cereri de rețea sau telemetrie. Licență MIT.
