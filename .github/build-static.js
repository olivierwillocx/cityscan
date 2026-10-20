#!/usr/bin/env node
// CityScan — génération des pages statiques, du sitemap et des flux RSS.
//
// Exécuté à chaque déploiement (voir .github/workflows/deploy.yml), sur le serveur
// de GitHub : rien de ce qui est produit ici n'est ajouté au dépôt. Il produit :
//   f/<langue>/<id>.html   une page lisible et partageable par fiche (aperçu LinkedIn, indexation)
//   f/style.css            la mise en page de ces pages (couleurs et polices du site)
//   sitemap.xml            toutes les pages, avec les versions linguistiques liées
//   feed-fr.xml / feed-nl.xml / feed-en.xml   flux RSS des dernières fiches
//   index.html             balises de description et d'aperçu ajoutées si elles manquent
//   robots.txt             ligne « Sitemap » ajoutée si elle manque
//
// Le script est volontairement tolérant : en cas de problème il signale un avertissement
// et se termine sans erreur, pour ne jamais bloquer la mise en ligne du site.

const fs = require("fs");
const path = require("path");

const BASE = "https://cityscan.be";
const LANGS = ["fr", "nl", "en"];
const ROOT = process.cwd();

const T = {
  fr: {
    locale: "fr_BE", home: "CityScan — initiatives de villes européennes pour Bruxelles",
    open: "Ouvrir dans CityScan", all: "Toutes les fiches de",
    ville: "Ville / autorité", comp: "Compétence bruxelloise", quoi: "De quoi s'agit-il",
    res: "Résultats connus", trans: "Transposabilité à Bruxelles", angle: "Angle parlementaire",
    src: "Sources", transpoL: "Transposabilité",
    transpo: { forte: "forte", moyenne: "moyenne", faible: "faible" },
    verdict: { best: "Bonne pratique", bad: "Mauvaise pratique", watch: "À évaluer" },
    inst: { "Région": "Région", COCOM: "COCOM", COCOF: "COCOF", "COCOM / COCOF": "COCOM / COCOF" },
    publisher: "Éditeur responsable : Olivier Willocx, Avenue Huart Hamoir 71, 1030 Bruxelles",
    desc: "Les initiatives de villes européennes utiles aux compétences de la Région bruxelloise, de la COCOM et de la COCOF, en fiches sourcées.",
    feed: "CityScan — dernières fiches",
  },
  nl: {
    locale: "nl_BE", home: "CityScan — initiatieven van Europese steden voor Brussel",
    open: "Openen in CityScan", all: "Alle fiches van",
    ville: "Stad / overheid", comp: "Brusselse bevoegdheid", quoi: "Waarover gaat het",
    res: "Bekende resultaten", trans: "Overdraagbaarheid naar Brussel", angle: "Parlementaire invalshoek",
    src: "Bronnen", transpoL: "Overdraagbaarheid",
    transpo: { forte: "sterk", moyenne: "gemiddeld", faible: "zwak" },
    verdict: { best: "Goede praktijk", bad: "Slechte praktijk", watch: "Te evalueren" },
    inst: { "Région": "Gewest", COCOM: "GGC", COCOF: "COCOF", "COCOM / COCOF": "GGC / COCOF" },
    publisher: "Verantwoordelijke uitgever: Olivier Willocx, Huart Hamoirlaan 71, 1030 Brussel",
    desc: "Initiatieven van Europese steden die nuttig zijn voor de bevoegdheden van het Brussels Gewest, de GGC en de COCOF, in gedocumenteerde fiches.",
    feed: "CityScan — laatste fiches",
  },
  en: {
    locale: "en_GB", home: "CityScan — European city initiatives for Brussels",
    open: "Open in CityScan", all: "All entries for",
    ville: "City / authority", comp: "Brussels competence", quoi: "What it is about",
    res: "Known results", trans: "Transferability to Brussels", angle: "Parliamentary angle",
    src: "Sources", transpoL: "Transferability",
    transpo: { forte: "strong", moyenne: "moderate", faible: "weak" },
    verdict: { best: "Good practice", bad: "Bad practice", watch: "To be assessed" },
    inst: { "Région": "Region", COCOM: "COCOM", COCOF: "COCOF", "COCOM / COCOF": "COCOM / COCOF" },
    publisher: "Responsible publisher: Olivier Willocx, Avenue Huart Hamoir 71, 1030 Brussels",
    desc: "Initiatives from European cities that matter for the competences of the Brussels Region, COCOM and COCOF, in sourced entries.",
    feed: "CityScan — latest entries",
  },
};

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const xml = (s) => esc(s).replace(/'/g, "&apos;");

function warn(msg) { console.log("::warning::" + msg); }

function loadData() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const files = [...html.matchAll(/<script src="(data\/[^"]+\.js)"/g)].map((m) => m[1])
    .filter((f) => !/pages(-ia)?\.js$/.test(f));
  global.LABMR = { editions: [], fiches: [] };
  let loaded = 0;
  for (const f of files) {
    try {
      (0, eval)(fs.readFileSync(path.join(ROOT, f), "utf8"));
      loaded++;
    } catch (e) {
      warn("fichier de données illisible : " + f + " (" + e.message.slice(0, 80) + ")");
    }
  }
  const L = global.LABMR;
  const patch = L.enPatch || {};
  for (const f of L.fiches) {
    const e = patch[f.id];
    if (!e) continue;
    for (const k in e) if (f[k] && typeof f[k] === "object" && f[k].en == null) f[k].en = e[k];
  }
  console.log("données chargées : " + loaded + "/" + files.length + " fichiers, " + L.fiches.length + " fiches");
  return L.fiches.slice().sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || "") || a.id.localeCompare(b.id));
}

const pick = (o, lang) => (o == null ? "" : typeof o === "string" ? o : (o[lang] != null ? o[lang] : ""));

function shorten(text, max) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[ ,;:.\u2014-]+$/, "") + "…";
}

const STYLE = `:root{--bg:#F4F5F9;--surface:#FFFFFF;--ink:#171E33;--muted:#5B6480;--line:#D9DDE8;--accent:#2247C9;--accent-ink:#FFFFFF;--best:#1B7F5C;--best-soft:#DFF3EA;--bad:#B8322A;--bad-soft:#F9E3E0;--watch:#A86E0C;--watch-soft:#FBEFD6;--display:"Fraunces",Georgia,"Times New Roman",serif;--body:"Source Sans 3","Segoe UI",Helvetica,Arial,sans-serif}
@media (prefers-color-scheme:dark){:root{--bg:#0E1220;--surface:#161B2D;--ink:#E8EBF4;--muted:#A3ABC4;--line:#2B3352;--accent:#7B98FF;--accent-ink:#0E1220;--best:#5BC79A;--best-soft:#123A2C;--bad:#F08A80;--bad-soft:#48201C;--watch:#F0B85A;--watch-soft:#3E2E0F}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.6}
a{color:var(--accent)}
header.top{border-bottom:1px solid var(--line);background:var(--surface)}
header.top div{max-width:760px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
header.top a.brand{font-family:var(--display);font-weight:700;font-size:22px;text-decoration:none;color:var(--ink)}
.langs a{margin-left:12px;text-decoration:none;font-size:14px;font-weight:600}
.langs a[aria-current]{color:var(--ink);text-decoration:underline}
main{max-width:760px;margin:0 auto;padding:28px 20px 40px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.chip{font-size:13px;font-weight:600;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--muted)}
.chip.best{background:var(--best-soft);color:var(--best);border-color:transparent}
.chip.bad{background:var(--bad-soft);color:var(--bad);border-color:transparent}
.chip.watch{background:var(--watch-soft);color:var(--watch);border-color:transparent}
h1{font-family:var(--display);font-weight:700;line-height:1.2;margin:0 0 6px;font-size:30px;text-wrap:balance}
.date{color:var(--muted);margin:0 0 24px}
dl{margin:0}
dt{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-top:22px}
dd{margin:4px 0 0}
dd.angle{border-left:3px solid var(--accent);padding-left:14px}
ul{margin:4px 0 0;padding-left:20px}
.cta{margin:34px 0 0;display:flex;gap:12px;flex-wrap:wrap}
.btn{display:inline-block;padding:10px 18px;border-radius:8px;font-weight:600;text-decoration:none;border:1px solid var(--accent)}
.btn.primary{background:var(--accent);color:var(--accent-ink)}
footer{max-width:760px;margin:0 auto;padding:0 20px 36px;color:var(--muted);font-size:13px}
`;

function renderPage(f, lang, i18n) {
  const L = T[lang];
  const titre = pick(f.titre, lang);
  const url = `${BASE}/f/${lang}/${f.id}.html`;
  const appUrl = `${BASE}/#/${lang}/city/${encodeURIComponent(f.villeKey)}`;
  const quoi = pick(f.quoi, lang);
  const description = shorten(quoi || pick(f.angle, lang), 158);
  const alts = LANGS.filter((l) => i18n.has(l))
    .map((l) => `<link rel="alternate" hreflang="${l}" href="${BASE}/f/${l}/${f.id}.html">`).join("\n");
  const switcher = LANGS.filter((l) => i18n.has(l))
    .map((l) => `<a href="${BASE}/f/${l}/${f.id}.html" hreflang="${l}"${l === lang ? ' aria-current="page"' : ""}>${l.toUpperCase()}</a>`).join("");
  const sources = (f.sources || []).map((s) =>
    `<li>${esc(s.media)}, ${esc(s.date)} — <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(String(s.url).replace(/^https?:\/\/(www\.)?/, "").slice(0, 64))}${String(s.url).length > 72 ? "…" : ""}</a></li>`).join("");
  const field = (label, val, cls) => (val ? `<dt>${label}</dt><dd${cls ? ` class="${cls}"` : ""}>${esc(val)}</dd>` : "");
  const jsonld = {
    "@context": "https://schema.org", "@type": "Article", headline: titre, inLanguage: lang,
    datePublished: f.dateISO, description,
    author: { "@type": "Person", name: "Olivier Willocx" }, publisher: { "@type": "Organization", name: "CityScan", url: BASE },
    mainEntityOfPage: url,
  };
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titre)} — CityScan</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${alts}
<link rel="alternate" hreflang="x-default" href="${BASE}/f/${i18n.has("fr") ? "fr" : lang}/${f.id}.html">
<meta property="og:type" content="article">
<meta property="og:site_name" content="CityScan">
<meta property="og:locale" content="${L.locale}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(titre)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="stylesheet" href="/fonts/fonts.css">
<link rel="stylesheet" href="/f/style.css">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
</head>
<body>
<header class="top"><div><a class="brand" href="${BASE}/#/${lang}/home">CityScan</a><nav class="langs" aria-label="Langue">${switcher}</nav></div></header>
<main>
<div class="chips"><span class="chip ${esc(f.verdict)}">${esc(L.verdict[f.verdict] || f.verdict)}</span><span class="chip">${esc(L.inst[f.inst] || f.inst)}</span><span class="chip">${esc(pick(f.theme, lang))}</span><span class="chip">${esc(f.villeKey)} · ${esc(f.pays)}</span></div>
<h1>${esc(titre)}</h1>
<p class="date">${esc(pick(f.date, lang))}</p>
<dl>
${field(L.ville, pick(f.ville, lang))}
${field(L.comp, pick(f.competence, lang))}
${field(L.quoi, quoi)}
${field(L.res, pick(f.resultats, lang))}
${field(L.trans, pick(f.transposabilite, lang))}
${field(L.angle, pick(f.angle, lang), "angle")}
<dt>${L.src}</dt><dd><ul>${sources}</ul></dd>
</dl>
<div class="cta"><a class="btn primary" href="${appUrl}">${L.all} ${esc(f.villeKey)} →</a><a class="btn" href="${BASE}/#/${lang}/home">${L.open}</a></div>
</main>
<footer>${esc(L.publisher)}</footer>
</body>
</html>
`;
}

function build() {
  const fiches = loadData();
  if (!fiches.length) { warn("aucune fiche chargée, pages statiques non générées"); return; }

  const outDir = path.join(ROOT, "f");
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const l of LANGS) fs.mkdirSync(path.join(outDir, l), { recursive: true });
  fs.writeFileSync(path.join(outDir, "style.css"), STYLE);

  const urls = [];
  let pages = 0;
  for (const f of fiches) {
    if (!f.id || !/^[A-Za-z0-9._-]+$/.test(f.id)) { warn("identifiant ignoré : " + f.id); continue; }
    const have = new Set(LANGS.filter((l) => pick(f.titre, l) && pick(f.quoi, l)));
    if (!have.size) continue;
    for (const l of have) {
      fs.writeFileSync(path.join(outDir, l, f.id + ".html"), renderPage(f, l, have));
      pages++;
    }
    urls.push({ f, have });
  }

  // sitemap.xml
  const today = new Date().toISOString().slice(0, 10);
  let sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
  sm += `<url><loc>${BASE}/</loc><lastmod>${esc(fiches[0].dateISO || today)}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n`;
  for (const { f, have } of urls) {
    for (const l of have) {
      sm += `<url><loc>${BASE}/f/${l}/${f.id}.html</loc><lastmod>${esc(f.dateISO || today)}</lastmod>`;
      for (const a of have) sm += `<xhtml:link rel="alternate" hreflang="${a}" href="${BASE}/f/${a}/${f.id}.html"/>`;
      sm += `</url>\n`;
    }
  }
  sm += `</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sm);

  // flux RSS (40 fiches les plus récentes par langue)
  for (const l of LANGS) {
    const items = urls.filter((u) => u.have.has(l)).slice(0, 40);
    let rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`;
    rss += `<title>${xml(T[l].feed)}</title>\n<link>${BASE}/#/${l}/home</link>\n<description>${xml(T[l].desc)}</description>\n<language>${l}</language>\n`;
    rss += `<atom:link href="${BASE}/feed-${l}.xml" rel="self" type="application/rss+xml"/>\n`;
    for (const { f } of items) {
      const link = `${BASE}/f/${l}/${f.id}.html`;
      const d = f.dateISO ? new Date(f.dateISO + "T08:00:00Z").toUTCString() : new Date().toUTCString();
      rss += `<item><title>${xml(pick(f.titre, l))}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${d}</pubDate><description>${xml(shorten(pick(f.quoi, l), 400))}</description></item>\n`;
    }
    rss += `</channel>\n</rss>\n`;
    fs.writeFileSync(path.join(ROOT, `feed-${l}.xml`), rss);
  }

  // index.html : description, aperçu de partage, flux (ajoutés une seule fois)
  const ip = path.join(ROOT, "index.html");
  let ih = fs.readFileSync(ip, "utf8");
  if (!ih.includes('property="og:title"')) {
    const head = [
      `<meta name="description" content="${esc(T.fr.desc)}">`,
      `<link rel="canonical" href="${BASE}/">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="CityScan">`,
      `<meta property="og:title" content="${esc(T.fr.home)}">`,
      `<meta property="og:description" content="${esc(T.fr.desc)}">`,
      `<meta property="og:url" content="${BASE}/">`,
      `<meta name="twitter:card" content="summary">`,
      ...LANGS.map((l) => `<link rel="alternate" type="application/rss+xml" hreflang="${l}" title="${esc(T[l].feed)}" href="/feed-${l}.xml">`),
    ].join("\n") + "\n";
    const i = ih.indexOf("</title>");
    if (i === -1) warn("balise </title> introuvable dans index.html : balises d'aperçu non ajoutées");
    else { ih = ih.slice(0, i + 8) + "\n" + head + ih.slice(i + 8); fs.writeFileSync(ip, ih); }
  }

  // robots.txt : ligne Sitemap
  const rp = path.join(ROOT, "robots.txt");
  let rb = fs.existsSync(rp) ? fs.readFileSync(rp, "utf8") : "User-agent: *\nAllow: /\n";
  if (!/^Sitemap:/mi.test(rb)) fs.writeFileSync(rp, rb.replace(/\s*$/, "\n") + `Sitemap: ${BASE}/sitemap.xml\n`);

  console.log(`pages statiques : ${pages} (${urls.length} fiches), sitemap : ${urls.reduce((n, u) => n + u.have.size, 1)} adresses, 3 flux RSS`);
}

try { build(); } catch (e) { warn("génération des pages statiques interrompue : " + e.message); }
process.exit(0);
