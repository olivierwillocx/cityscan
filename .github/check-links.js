#!/usr/bin/env node
// CityScan — contrôle des liens vers les sources citées dans les fiches.
//
// Exécuté chaque lundi par .github/workflows/check-links.yml (et à la demande).
// Il teste l'adresse de chaque source et distingue :
//   - lien MORT      : la page n'existe plus (404, 410) ou le site n'existe plus (nom de domaine introuvable)
//   - non vérifiable : le site refuse les robots (403, 429), est lent ou en panne (délai dépassé, 5xx)
// Seuls les liens morts font échouer le contrôle : GitHub envoie alors un courriel d'alerte
// au propriétaire du dépôt, avec la liste des fiches à corriger dans le résumé de l'exécution.

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const UA = "Mozilla/5.0 (compatible; CityScanLinkCheck/1.0; +https://cityscan.be)";
const TIMEOUT_MS = 20000;
const CONCURRENCY = 8;
// Sites qui répondent 404 aux robots alors que la page existe (vérifié à la main) :
// leurs 404 sont classés « non vérifiables » plutôt que « morts ».
const BOT_404_HOSTS = ["www.1news.co.nz"];

function loadFiches() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const files = [...html.matchAll(/<script src="(data\/[^"]+\.js)"/g)].map((m) => m[1])
    .filter((f) => !/pages(-ia)?\.js$/.test(f));
  global.LABMR = { editions: [], fiches: [] };
  for (const f of files) {
    try { (0, eval)(fs.readFileSync(path.join(ROOT, f), "utf8")); }
    catch (e) { console.log("::warning::fichier illisible : " + f); }
  }
  return global.LABMR.fiches;
}

async function probe(url) {
  const attempt = async (method) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { method, redirect: "follow", signal: ctl.signal, headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" } });
      if (method === "GET") { try { await res.body?.cancel(); } catch (_) {} }
      return { status: res.status };
    } catch (e) {
      const code = (e.cause && e.cause.code) || e.name;
      return { error: String(code) };
    } finally { clearTimeout(timer); }
  };
  let r = await attempt("HEAD");
  // beaucoup de sites refusent HEAD : on confirme par un GET avant de conclure
  if (r.error || r.status >= 400) r = await attempt("GET");
  if (r.error || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000)); r = await attempt("GET"); }
  return r;
}

function classify(r, url) {
  if (r.status && r.status < 400) return "ok";
  if (r.status === 404 && BOT_404_HOSTS.includes(new URL(url).hostname)) return "unverifiable";
  if (r.status === 404 || r.status === 410) return "dead";
  if (r.error === "ENOTFOUND") return "dead";
  return "unverifiable";
}

async function main() {
  const fiches = loadFiches();
  const byUrl = new Map();
  for (const f of fiches) for (const s of f.sources || []) {
    if (!s.url || !/^https?:\/\//.test(s.url)) continue;
    if (!byUrl.has(s.url)) byUrl.set(s.url, []);
    byUrl.get(s.url).push({ id: f.id, media: s.media });
  }
  let urls = [...byUrl.keys()];
  if (process.env.CHECK_LIMIT) urls = urls.slice(0, +process.env.CHECK_LIMIT);   // essai local
  console.log(fiches.length + " fiches, " + urls.length + " adresses de sources à contrôler");

  const results = new Map();
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const u = urls[next++];
      const r = await probe(u);
      results.set(u, { ...r, cls: classify(r, u) });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const count = { ok: 0, dead: 0, unverifiable: 0 };
  for (const r of results.values()) count[r.cls]++;
  const dead = urls.filter((u) => results.get(u).cls === "dead");
  const unv = urls.filter((u) => results.get(u).cls === "unverifiable");

  let md = `## Contrôle des liens CityScan\n\n`;
  md += `${urls.length} adresses contrôlées : **${count.ok} valides**, **${count.dead} mortes**, ${count.unverifiable} non vérifiables (site qui refuse les robots, lent ou en panne).\n\n`;
  if (dead.length) {
    md += `### Liens morts à corriger\n\n| Fiche | Média | Adresse | Constat |\n|---|---|---|---|\n`;
    for (const u of dead) for (const x of byUrl.get(u)) {
      const r = results.get(u);
      md += `| ${x.id} | ${x.media} | ${u} | ${r.status || r.error} |\n`;
    }
    md += `\n`;
  }
  if (unv.length) {
    md += `<details><summary>Non vérifiables (${unv.length})</summary>\n\n`;
    for (const u of unv) md += `- ${u} — ${results.get(u).status || results.get(u).error}\n`;
    md += `\n</details>\n`;
  }
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);

  if (dead.length) {
    console.log("::error::" + dead.length + " lien(s) mort(s) parmi les sources citées");
    process.exit(1);
  }
}

main().catch((e) => { console.log("::warning::contrôle interrompu : " + e.message); process.exit(0); });
