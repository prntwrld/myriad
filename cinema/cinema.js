/* Myriad — Cinema. Topic pages for filmmakers, films, and movements.
   Wikipedia gives the words and the posters; Wikidata (through its SPARQL query service) gives the
   filmographies, casts and crews, collaborators, movements and influences; the Internet Archive gives
   films that are free to watch; Wikimedia Commons gives images. */
{
const {ROOT, esc} = window.Myriad;
const $ = id => document.getElementById(id);
const ext = `target="_blank" rel="noopener"`;
const W = "https://en.wikipedia.org/w/api.php?format=json&origin=*&";
const WD = "https://www.wikidata.org/w/api.php?format=json&origin=*&";
const LANGS = "en,mul,fr,it,de,es,ja,ru,sv,pt";
const FILM = "wd:Q11424";

/* fetch JSON with a time limit, and up to two polite retries, each waiting longer, if a service says "too many requests" */
const getJSON = async (url, ms=20000, tries=3, opts={}) => {
  const r = await fetch(url, {signal: AbortSignal.timeout(ms), ...opts});
  if(r.status === 429 && tries > 1){ await new Promise(ok => setTimeout(ok, 1200 * (4 - tries) + Math.random() * 600)); return getJSON(url, ms, tries-1, opts); }
  if(!r.ok) throw new Error(r.status);
  return r.json();
};
/* Wikimedia asks browser apps to name themselves in an Api-User-Agent header; the query service allows it */
const sparql = q => getJSON("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), 30000, 3,
    {headers: {"Api-User-Agent": "Myriad/1.0 (https://prntwrld.github.io/myriad/)"}})
  .then(j => j.results.bindings.map(b => Object.fromEntries(Object.entries(b).map(([k,v]) => [k, v.value]))));
const qid = uri => uri?.replace(/^.*\//, "");
const label = (b, k) => { const v = b[k + "Label"]; return v && !/^Q\d+$/.test(v) ? v : ""; };
/* a Wikipedia article URL (from a sitelink) → its title */
const artTitle = u => u ? decodeURIComponent(u.replace(/^.*\/wiki\//, "")).replace(/_/g, " ") : "";
/* a Commons file (from Wikidata's image property) → a small thumbnail */
const commons = (u, w=240) => u ? u.replace(/^http:/, "https:") + "?width=" + w : "";
const here = t => `./?t=${encodeURIComponent(t)}`;
const ROLE = {dir:"Director", wri:"Writer", cast:"Actor", dop:"Cinematographer", mus:"Composer", edi:"Editor", pro:"Producer"};
const ROLE_PLURAL = {dir:"Directed", wri:"Wrote", cast:"Acted in", dop:"Shot", mus:"Scored", edi:"Edited", pro:"Produced"};
const ROLE_PROPS = `(wdt:P57 "dir") (wdt:P58 "wri") (wdt:P161 "cast") (wdt:P344 "dop") (wdt:P86 "mus") (wdt:P1040 "edi") (wdt:P162 "pro")`;
let token = 0;

/* ---------- Wikipedia ---------- */
async function wikiSearch(q, n=6){
  const j = await getJSON(W + "action=query&list=search&srnamespace=0&srlimit=" + n + "&srsearch=" + encodeURIComponent(q));
  return (j.query?.search || []).map(x => x.title);
}
const summary = t => getJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t.replace(/ /g, "_")));
const entity = async id => (await getJSON(WD + "action=wbgetentities&props=claims|sitelinks&sitefilter=enwiki&ids=" + id)).entities?.[id] || {};

/* posters: each film article's lead image, 50 titles a request, remembered between pages.
   pilicense=any includes the fair-use posters that only English Wikipedia hosts. */
const posterCache = {};
async function posters(titles){
  const need = [...new Set(titles.filter(t => t && !(t in posterCache)))];
  for(let i = 0; i < need.length; i += 50){
    const batch = need.slice(i, i + 50);
    try {
      const j = await getJSON(W + "action=query&prop=pageimages&piprop=thumbnail&pithumbsize=360&pilicense=any&redirects=1&titles=" + encodeURIComponent(batch.join("|")));
      const back = {};
      for(const m of [...(j.query?.normalized || []), ...(j.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
      batch.forEach(t => posterCache[t] = "");
      for(const p of Object.values(j.query?.pages || {})) if(p.thumbnail) posterCache[back[p.title] || p.title] = p.thumbnail.source;
    } catch(e){}
  }
  return posterCache;
}

/* ---------- Wikidata queries ---------- */
/* everything a person worked on, with their roles, year, article and fame (number of Wikipedias) */
const filmography = id => sparql(`SELECT ?film ?filmLabel (MIN(YEAR(?d)) AS ?y) (GROUP_CONCAT(DISTINCT ?r; separator=",") AS ?roles) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) (SAMPLE(?ia) AS ?arch) WHERE {
  VALUES (?p ?r) { ${ROLE_PROPS} }
  ?film ?p wd:${id} . FILTER EXISTS { ?film wdt:P31/wdt:P279? ${FILM} }
  OPTIONAL { ?film wdt:P577 ?d } OPTIONAL { ?art schema:about ?film ; schema:isPartOf <https://en.wikipedia.org/> }
  OPTIONAL { ?film wdt:P724 ?ia }
  ?film wikibase:sitelinks ?sl .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LANGS}". }
} GROUP BY ?film ?filmLabel ORDER BY ?y`);

/* the people who shared the most films with someone, in any role */
const collaborators = id => sparql(`SELECT ?person ?personLabel (COUNT(DISTINCT ?film) AS ?n) (GROUP_CONCAT(DISTINCT ?r; separator=",") AS ?roles)
  (GROUP_CONCAT(DISTINCT ?fl; separator="|") AS ?films) (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) WHERE {
  VALUES (?p0) { (wdt:P57) (wdt:P58) (wdt:P161) (wdt:P344) (wdt:P86) (wdt:P1040) (wdt:P162) }
  VALUES (?p ?r) { ${ROLE_PROPS} }
  ?film ?p0 wd:${id} . FILTER EXISTS { ?film wdt:P31/wdt:P279? ${FILM} }
  ?film ?p ?person . FILTER(?person != wd:${id})
  OPTIONAL { ?film rdfs:label ?fl . FILTER(LANG(?fl) = "en") }
  OPTIONAL { ?person wdt:P18 ?img } OPTIONAL { ?art schema:about ?person ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LANGS}". }
} GROUP BY ?person ?personLabel HAVING(?n > 1) ORDER BY DESC(?n) LIMIT 24`);

/* movements, who influenced them, and whom they influenced */
const lineage = id => sparql(`SELECT ?x ?xLabel ?rel (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) WHERE {
  { wd:${id} wdt:P135 ?x . BIND("movement" AS ?rel) } UNION { wd:${id} wdt:P737 ?x . BIND("from" AS ?rel) }
  UNION { ?x wdt:P737 wd:${id} . BIND("to" AS ?rel) } UNION { wd:${id} wdt:P1066 ?x . BIND("from" AS ?rel) }
  UNION { ?x wdt:P1066 wd:${id} . BIND("to" AS ?rel) }
  OPTIONAL { ?x wdt:P18 ?img } OPTIONAL { ?art schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> }
  ?x wikibase:sitelinks ?sl .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LANGS}". }
} GROUP BY ?x ?xLabel ?rel ORDER BY DESC(?pop) LIMIT 60`);

/* names, portraits and articles for a list of Wikidata items (a film's cast and crew) */
const describe = ids => ids.length ? sparql(`SELECT ?x ?xLabel (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) WHERE {
  VALUES ?x { ${ids.map(i => "wd:" + i).join(" ")} }
  OPTIONAL { ?x wdt:P18 ?img } OPTIONAL { ?art schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LANGS}". }
} GROUP BY ?x ?xLabel`).then(rows => Object.fromEntries(rows.map(r => [qid(r.x), {name: label(r, "x"), pic: r.pic, title: artTitle(r.a)}]))) : Promise.resolve({});

/* films by any of these directors, best known first */
const filmsBy = (ids, not) => sparql(`SELECT ?film ?filmLabel (MIN(YEAR(?d)) AS ?y) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) WHERE {
  VALUES ?who { ${ids.map(i => "wd:" + i).join(" ")} } ?film wdt:P57 ?who . FILTER(?film != wd:${not})
  FILTER EXISTS { ?film wdt:P31/wdt:P279? ${FILM} }
  OPTIONAL { ?film wdt:P577 ?d } OPTIONAL { ?art schema:about ?film ; schema:isPartOf <https://en.wikipedia.org/> }
  ?film wikibase:sitelinks ?sl . SERVICE wikibase:label { bd:serviceParam wikibase:language "${LANGS}". }
} GROUP BY ?film ?filmLabel ORDER BY DESC(?pop) LIMIT 14`);

/* films of a movement or genre, best known first: films tagged with it, and films directed by the people
   Wikidata counts as its members (it tags filmmakers with movements far more often than films) */
const collection = id => sparql(`SELECT ?film ?filmLabel (MIN(YEAR(?d)) AS ?y) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop)
  (GROUP_CONCAT(DISTINCT STR(?dir); separator=",") AS ?dirs) WHERE {
  { ?film wdt:P135 wd:${id} } UNION { ?film wdt:P136 wd:${id} }
  UNION { ?member wdt:P135 wd:${id} ; wdt:P31 wd:Q5 . ?film wdt:P57 ?member }
  FILTER EXISTS { ?film wdt:P31/wdt:P279? ${FILM} }
  OPTIONAL { ?film wdt:P57 ?dir } OPTIONAL { ?film wdt:P577 ?d }
  OPTIONAL { ?art schema:about ?film ; schema:isPartOf <https://en.wikipedia.org/> }
  ?film wikibase:sitelinks ?sl . SERVICE wikibase:label { bd:serviceParam wikibase:language "${LANGS}". }
} GROUP BY ?film ?filmLabel ORDER BY DESC(?pop) LIMIT 90`);

/* ---------- Wikidata claims ---------- */
const claimIds = (e, p) => (e.claims?.[p] || []).filter(c => c.rank !== "deprecated").map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const claimStr = (e, p) => e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;
const claimTime = (e, p) => {
  const v = claimStr(e, p); if(!v?.time) return "";
  const m = v.time.match(/^([+-])(\d+)-(\d\d)-(\d\d)/); if(!m) return "";
  const y = +m[2] * (m[1] === "-" ? -1 : 1);
  if(v.precision >= 11 && +m[3] && +m[4]) return new Date(Date.UTC(y, +m[3]-1, +m[4])).toLocaleDateString("en-US", {year:"numeric", month:"long", day:"numeric", timeZone:"UTC"});
  return String(y);
};
const isHuman = e => claimIds(e, "P31").includes("Q5");
const isFilm = e => !!e.claims?.P57 || claimIds(e, "P31").some(q => ["Q11424","Q24869","Q202866","Q93204","Q24862","Q226730","Q506240"].includes(q));

/* ---------- small pieces of page ---------- */
const section = (id, label, sub) => `<section class="section" id="${id}" hidden><h2 class="label">${esc(label)}</h2>${sub ? `<p class="sub">${sub}</p>` : ""}<div class="body"></div></section>`;
const show = (id, html) => { const s = $(id); if(!s) return; s.querySelector(".body").innerHTML = html; s.hidden = false; };
/* a poster: the film's lead image, or a cloth cover with its title */
const poster = f => {
  const src = posterCache[f.title];
  const inner = src ? `<img src="${esc(src)}" alt="" loading="lazy" data-t="${esc(f.name)}">` : `<span class="cover">${esc(f.name)}</span>`;
  const href = f.title ? here(f.title) : `https://www.wikidata.org/wiki/${f.id}`;
  return `<a class="poster" href="${esc(href)}"${f.title ? "" : ` ${ext}`} data-film="${esc(f.id)}"><div class="frame">${inner}</div>
    <div class="cap"><span class="t">${esc(f.name)}</span>${f.year ? `<span class="y">${f.year}</span>` : ""}</div></a>`;
};
/* a person: their portrait (in black and white until you point at it), name, and a line about them */
const face = p => {
  const inner = p.pic ? `<img src="${esc(commons(p.pic))}" alt="" loading="lazy">` : `<span class="initials">${esc(p.name.split(/\s+/).map(w => w[0]).slice(0,2).join(""))}</span>`;
  const href = p.title ? here(p.title) : `https://www.wikidata.org/wiki/${p.id}`;
  return `<a class="face" href="${esc(href)}"${p.title ? "" : ` ${ext}`}><div class="ph">${inner}</div><div class="cap"><span class="t">${esc(p.name)}</span>${p.note ? `<span class="y">${esc(p.note)}</span>` : ""}</div></a>`;
};
const linkRow = (title, links) => links.length ? `<p class="watch"><b>${esc(title)}</b>${links.map(([t,u]) => `<a href="${esc(u)}" ${ext}>${esc(t)}</a>`).join("")}</p>` : "";
const filmRows = rows => rows.map(r => ({id: qid(r.film), name: label(r, "film") || artTitle(r.a), year: r.y ? +r.y : 0,
  roles: (r.roles || "").split(",").filter(Boolean), title: artTitle(r.a), pop: +r.pop || 0, ia: r.arch || "", dirs: (r.dirs || "").split(",").filter(Boolean).map(qid)}))
  .filter(f => f.name);

/* the poster wall: films in order, grouped by decade */
function wall(films){
  const by = {};
  for(const f of films) (by[f.year ? Math.floor(f.year / 10) * 10 + "s" : "Undated"] ||= []).push(f);
  return Object.entries(by).sort(([a],[b]) => a === "Undated" ? 1 : b === "Undated" ? -1 : a.localeCompare(b))
    .map(([d, fs]) => `<div class="decade"><h3>${esc(d)}</h3><div class="wall">${fs.map(poster).join("")}</div></div>`).join("");
}

/* the career chart: films a year, one bar per year, a tooltip naming that year's films */
function career(films){
  const dated = films.filter(f => f.year);
  if(dated.length < 3) return "";
  const lo = Math.min(...dated.map(f => f.year)), hi = Math.max(...dated.map(f => f.year));
  const per = {}; dated.forEach(f => (per[f.year] ||= []).push(f.name));
  const max = Math.max(...Object.values(per).map(x => x.length));
  const years = Array.from({length: hi - lo + 1}, (_, i) => lo + i);
  const ticks = years.filter(y => y % 10 === 0 || y === lo);
  const busiest = Object.entries(per).sort((a,b) => b[1].length - a[1].length)[0];
  return `<div class="career" role="img" aria-label="${esc(`${dated.length} films from ${lo} to ${hi}; busiest year ${busiest[0]} with ${busiest[1].length}`)}">
    <div class="bars" style="--n:${years.length}">${years.map(y => `<div class="yr" data-y="${y}" data-films="${esc((per[y] || []).join("|"))}">${
      per[y] ? `<i style="height:${Math.max(6, per[y].length / max * 100)}%"></i>` : ""}</div>`).join("")}</div>
    <div class="axis" style="--n:${years.length}">${ticks.map(y => `<span style="--i:${y - lo}">${y}</span>`).join("")}</div>
    <p class="chart-note">${dated.length} films, ${lo}–${hi} · busiest year ${busiest[0]} (${busiest[1].length}) · most in one year: ${max}</p>
  </div>`;
}
/* one tooltip, shared by every chart and the collaborator web */
const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; document.body.append(tip);
const placeTip = (e, html) => {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect(), x = Math.min(innerWidth - r.width - 8, Math.max(8, e.clientX - r.width / 2));
  tip.style.left = x + "px"; tip.style.top = Math.max(8, e.clientY - r.height - 14) + "px";
};
document.addEventListener("pointermove", e => {
  const y = e.target.closest?.(".yr"), n = e.target.closest?.(".node");
  if(y){ const fs = y.dataset.films ? y.dataset.films.split("|") : [];
    placeTip(e, `<b>${y.dataset.y}</b>${fs.length ? fs.map(f => `<span>${esc(f)}</span>`).join("") : `<span class="none">No films</span>`}`); }
  else if(n) placeTip(e, `<b>${esc(n.dataset.name)}</b><span class="none">${esc(n.dataset.note)}</span>${(n.dataset.films || "").split("|").filter(Boolean).slice(0,8).map(f => `<span>${esc(f)}</span>`).join("")}`);
  else tip.hidden = true;
});
document.addEventListener("scroll", () => tip.hidden = true, {passive:true});

/* the collaborator web: the subject in the middle, the people they worked with most around them,
   each line as thick as the number of films they shared */
function web(center, people){
  const ps = people.slice(0, 14); if(ps.length < 3) return "";
  const Wd = 900, H = 640, cx = Wd / 2, cy = H / 2, max = ps[0].n;
  const nodes = ps.map((p, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / ps.length;
    return {...p, x: cx + Math.cos(a) * 340, y: cy + Math.sin(a) * 236, r: 20 + 16 * p.n / max, up: Math.sin(a) < -0.2};
  });
  const clip = (id, x, y, r) => `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath>`;
  const disc = (id, x, y, r, pic, name) => pic
    ? `<image href="${esc(commons(pic, 160))}" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
    : `<text x="${x}" y="${y + 5}" class="ini">${esc(name.split(/\s+/).map(w => w[0]).slice(0,2).join(""))}</text>`;
  return `<svg class="web" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(`People ${center.name} worked with most`)}">
    <defs>${clip("c0", cx, cy, 46)}${nodes.map((n, i) => clip("c" + (i + 1), n.x, n.y, n.r)).join("")}</defs>
    ${nodes.map(n => `<line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" style="stroke-width:${1 + 7 * n.n / max}"/>`).join("")}
    <circle class="disc" cx="${cx}" cy="${cy}" r="48"/>${disc("c0", cx, cy, 46, center.pic, center.name)}
    ${nodes.map((n, i) => `<a href="${esc(n.title ? here(n.title) : "https://www.wikidata.org/wiki/" + n.id)}" class="node" data-name="${esc(n.name)}" data-note="${esc(n.note)}" data-films="${esc(n.films)}">
      <circle class="disc" cx="${n.x}" cy="${n.y}" r="${n.r + 2}"/>${disc("c" + (i + 1), n.x, n.y, n.r, n.pic, n.name)}
      ${n.up ? `<text x="${n.x}" y="${n.y - n.r - 26}" class="nm">${esc(n.name)}</text><text x="${n.x}" y="${n.y - n.r - 9}" class="ct">${n.n} films</text>`
        : `<text x="${n.x}" y="${n.y + n.r + 22}" class="nm">${esc(n.name)}</text><text x="${n.x}" y="${n.y + n.r + 39}" class="ct">${n.n} films</text>`}</a>`).join("")}
  </svg>`;
}

/* ---------- the page ---------- */
const TOPIC = $("ctopic");
function shell(){
  TOPIC.innerHTML = `<div class="hero">
      <article class="lead" id="lead"><p class="status">Looking it up…</p></article>
      <aside class="side"><figure class="plate" id="plate" hidden><img class="pic" id="pic" alt=""></figure>
        <div class="facts" id="facts" hidden><h2 class="label">Quick facts</h2><dl id="factlist"></dl></div></aside></div>
    <div id="views"></div>`;
}

async function openTopic(title, others=[], query=""){
  const my = ++token;
  document.body.classList.add("on"); window.scrollTo(0, 0); tip.hidden = true;
  $("q").value = query || title;
  shell();
  let s;
  try { s = await summary(title); } catch(e){ if(my === token) $("lead").innerHTML = `<p class="status">Couldn't load that. Try again in a moment, or try another search.</p>`; return; }
  if(my !== token) return;
  const name = s.title || title;
  document.title = name + " — Cinema — Myriad";
  const disamb = s.type === "disambiguation";
  const otherLinks = others.filter(o => o !== title && o !== name).slice(0, 5);
  $("lead").innerHTML = `<h1>${esc(name)}</h1>
    ${s.description ? `<p class="desc">${esc(s.description)}</p>` : ""}
    <p class="extract">${esc(disamb ? "This name can mean several things. Try a more exact search." : s.extract)}</p>
    <p class="readon"><b>Read more</b><span id="readon"><a href="${esc(s.content_urls?.desktop?.page)}" ${ext}>Wikipedia</a><a href="${ROOT}?t=${encodeURIComponent(name)}&stay">Myriad's general page</a></span></p>
    ${otherLinks.length ? `<p class="others">Did you mean: ${otherLinks.map(o => `<a href="${here(o)}">${esc(o)}</a>`).join(" · ")}</p>` : ""}`;
  const thumb = s.thumbnail?.source, orig = s.originalimage;
  const img = thumb && orig?.width > 720 && /\/\d+px-/.test(thumb) ? thumb.replace(/\/\d+px-/, "/720px-") : orig?.source || thumb;
  if(img){ $("pic").src = img; $("plate").hidden = false; }
  if(!s.wikibase_item || disamb) return;
  let e;
  try { e = await entity(s.wikibase_item); } catch(err){ return; }
  if(my !== token) return;
  const ctx = {my, id: s.wikibase_item, name, e, pic: claimStr(e, "P18") ? "http://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(claimStr(e, "P18")) : ""};
  if(isFilm(e)){ $("plate").classList.add("is-poster"); return filmPage(ctx); }
  if(isHuman(e)) return personPage(ctx);
  return collectionPage(ctx);
}
const alive = ctx => ctx.my === token;
const setFacts = rows => {
  rows = rows.filter(r => r[1]); if(!rows.length) return;
  $("factlist").innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join(""); $("facts").hidden = false;
};
const peopleLinks = (ids, info, n=4) => ids.slice(0, n).map(i => info[i] ? (info[i].title ? `<a href="${here(info[i].title)}">${esc(info[i].name)}</a>` : esc(info[i].name)) : "").filter(Boolean).join(", ");

/* where to look for a film or a person's films */
const IDS = {
  P6127: ["Letterboxd", "https://letterboxd.com/film/$1/"], P7299: ["MUBI", "https://mubi.com/films/$1"],
  P345: ["IMDb", "https://www.imdb.com/$T/$1/"], P4947: ["TMDB", "https://www.themoviedb.org/movie/$1"],
  P4985: ["TMDB", "https://www.themoviedb.org/person/$1"], P1258: ["Rotten Tomatoes", "https://www.rottentomatoes.com/$1"],
  P1712: ["Metacritic", "https://www.metacritic.com/$1"]
};
const dbLinks = e => Object.entries(IDS).map(([p, [t, u]]) => { const v = claimStr(e, p); return v ? [t, u.replace("$1", v).replace("$T", String(v).startsWith("nm") ? "name" : "title")] : null; }).filter(Boolean);
const streamLinks = q => [
  ["Kanopy", "https://www.kanopy.com/en/search?query=" + encodeURIComponent(q)],
  ["Criterion Channel", "https://www.criterionchannel.com/search?q=" + encodeURIComponent(q)],
  ["JustWatch", "https://www.justwatch.com/us/search?q=" + encodeURIComponent(q)]];

/* pictures from the topic's Wikimedia Commons category */
async function gallery(e){
  const cat = claimStr(e, "P373"); if(!cat) return [];
  const j = await getJSON("https://commons.wikimedia.org/w/api.php?format=json&origin=*&action=query&generator=categorymembers&gcmtype=file&gcmlimit=24&prop=imageinfo&iiprop=url&iiurlwidth=420&gcmtitle="
    + encodeURIComponent("Category:" + cat));
  return Object.values(j.query?.pages || {}).filter(p => /\.(jpe?g|png|gif|tiff?|webp)$/i.test(p.title))
    .map(p => ({src: p.imageinfo?.[0]?.thumburl, u: p.imageinfo?.[0]?.descriptionurl, t: p.title.replace(/^File:|\.\w+$/g, "")})).filter(p => p.src).slice(0, 16);
}
const galleryHtml = imgs => `<div class="stills">${imgs.map(p => `<a href="${esc(p.u)}" ${ext} title="${esc(p.t)}"><img src="${esc(p.src)}" alt="${esc(p.t)}" loading="lazy"></a>`).join("")}</div>`;

/* ---------- a person: filmmaker, actor, cinematographer… ---------- */
async function personPage(ctx){
  const {e, id, name} = ctx;
  $("views").innerHTML = section("s-career", "Career", "Films a year — point at a bar to see which")
    + section("s-films", "Filmography", "Every film, in order — from Wikidata, with posters from Wikipedia")
    + section("s-collab", "Collaborators", "The people they made the most films with")
    + section("s-watch", "Where to watch", "Streaming and libraries — and any films free to watch in full")
    + section("s-lineage", "Movements & influence", "Where they came from, and where it went")
    + section("s-stills", "Images", "From Wikimedia Commons");

  const birth = claimTime(e, "P569"), death = claimTime(e, "P570");
  describe([...claimIds(e, "P19"), ...claimIds(e, "P106").slice(0, 4), ...claimIds(e, "P135"), ...claimIds(e, "P26").slice(0, 3)]).then(info => {
    if(!alive(ctx)) return;
    const names = (p, n=4) => claimIds(e, p).slice(0, n).map(i => info[i]?.name).filter(Boolean).join(", ");
    setFacts([["Born", esc([birth, names("P19", 1)].filter(Boolean).join(", "))], ["Died", esc(death)],
      ["Work", esc(names("P106"))], ["Movement", peopleLinks(claimIds(e, "P135"), info)], ["Spouse", peopleLinks(claimIds(e, "P26"), info, 3)]]);
  }).catch(() => {});

  /* filmography → career chart and the poster wall, one tab per role */
  filmography(id).then(async rows => {
    if(!alive(ctx)) return;
    const films = filmRows(rows);
    if(!films.length){ show("s-films", `<p class="status">No films found for ${esc(name)} in Wikidata.</p>`); return; }
    const counts = Object.keys(ROLE).map(r => [r, films.filter(f => f.roles.includes(r)).length]).filter(([, n]) => n);
    const first = counts.slice().sort((a, b) => b[1] - a[1])[0][0];
    const start = counts.find(([r]) => r === "dir") && counts.find(([r]) => r === "dir")[1] >= 3 ? "dir" : first;
    /* free films: the Internet Archive copies Wikidata links to their films — these play on the film's page */
    const free = films.filter(f => f.ia && f.title).sort((a, b) => a.year - b.year);
    if(free.length){
      await posters(free.map(f => f.title));
      if(alive(ctx)) $("free").innerHTML = `<h3 class="minor">Free to watch in full — ${free.length} ${free.length === 1 ? "film plays" : "films play"} on ${free.length === 1 ? "its" : "their"} page, from the Internet Archive</h3><div class="wall strip">${free.map(poster).join("")}</div>`;
    }
    let everything = false;
    const tabs = `<div class="tabs" role="group" aria-label="Role">${counts.map(([r, n]) => `<button type="button" data-role="${r}" aria-pressed="${r === start}">${ROLE_PLURAL[r]} <span>${n}</span></button>`).join("")}</div>`;
    const draw = async role => {
      const list = films.filter(f => f.roles.includes(role));
      $("s-career").querySelector(".body").innerHTML = tabs + career(list);
      $("s-career").querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.role === role));
      /* the wall shows the films with an English article first; the rest (shorts, fragments, lost films) on request */
      const known = list.filter(f => f.title), rest = list.length - known.length;
      const shown = everything || known.length < 6 ? list : known;
      const more = rest && known.length >= 6 ? `<p class="wall-more"><button type="button" class="linkish" data-all>${everything
        ? `Show only the ${known.length} best-documented films` : `Show all ${list.length}, including ${rest} ${rest === 1 ? "lesser-known work" : "shorts, fragments and lesser-known works"}`}</button></p>` : "";
      show("s-films", wall(shown) + more);
      await posters(shown.map(f => f.title));
      if(alive(ctx) && $("s-career").querySelector(`[data-role="${role}"][aria-pressed="true"]`)) show("s-films", wall(shown) + more);
    };
    $("s-career").onclick = ev => { const b = ev.target.closest("[data-role]"); if(b) draw(b.dataset.role); };
    $("s-films").onclick = ev => { if(!ev.target.closest("[data-all]")) return; everything = !everything;
      draw($("s-career").querySelector('[aria-pressed="true"]').dataset.role); };
    $("s-career").hidden = false;
    draw(start);
  }).catch(() => { if(alive(ctx)) show("s-films", `<p class="status">Couldn't reach Wikidata right now. Try again in a moment.</p>`); });

  collaborators(id).then(rows => {
    if(!alive(ctx) || !rows.length) return;
    const people = rows.map(r => ({id: qid(r.person), name: label(r, "person"), n: +r.n, pic: r.pic, title: artTitle(r.a),
      note: (r.roles || "").split(",").map(x => ROLE[x]).filter(Boolean).slice(0, 3).join(", "), films: r.films || ""})).filter(p => p.name);
    show("s-collab", `<div class="collab">${web({name, pic: ctx.pic}, people)}
      <ol class="ranked">${people.slice(0, 14).map(p => `<li><a href="${esc(p.title ? here(p.title) : "https://www.wikidata.org/wiki/" + p.id)}">${esc(p.name)}</a>
        <span class="role">${esc(p.note)}</span><span class="n">${p.n}</span></li>`).join("")}</ol></div>`);
  }).catch(() => {});

  show("s-watch", linkRow("Stream & rent", streamLinks(name)) + linkRow("Look up", [...dbLinks(e), ["Letterboxd", "https://letterboxd.com/search/" + encodeURIComponent(name) + "/"]])
    + `<div id="free"></div>`);

  lineage(id).then(rows => {
    if(!alive(ctx) || !rows.length) return;
    const pick = rel => rows.filter(r => r.rel === rel).map(r => ({id: qid(r.x), name: label(r, "x"), pic: r.pic, title: artTitle(r.a)})).filter(p => p.name);
    const mov = pick("movement"), from = pick("from"), to = pick("to");
    show("s-lineage", (mov.length ? `<p class="movements">${mov.map(m => `<a class="tag-link" href="${esc(m.title ? here(m.title) : "https://www.wikidata.org/wiki/" + m.id)}">${esc(m.name)}</a>`).join("")}</p>` : "")
      + (from.length ? `<h3 class="minor">Influenced by</h3><div class="faces">${from.slice(0, 12).map(face).join("")}</div>` : "")
      + (to.length ? `<h3 class="minor">Went on to influence</h3><div class="faces">${to.slice(0, 12).map(face).join("")}</div>` : ""));
  }).catch(() => {});

  gallery(e).then(g => { if(alive(ctx) && g.length) show("s-stills", galleryHtml(g)); }).catch(() => {});
}

/* ---------- a film ---------- */
async function filmPage(ctx){
  const {e, id, name} = ctx;
  const year = claimTime(e, "P577").slice(-4);
  const dirs = claimIds(e, "P57");
  const ia = claimStr(e, "P724");
  $("views").innerHTML = (ia ? section("s-play", "Watch it here", "Free and in full, from the Internet Archive") : "")
    + section("s-watch", "Where to watch", "Streaming, libraries, and the film's pages elsewhere")
    + section("s-cast", "Cast", "In order of billing")
    + section("s-crew", "Crew", "")
    + section("s-more", "More by the director", "Their best-known films")
    + section("s-mov", "From the same movement", "")
    + section("s-stills", "Images", "From Wikimedia Commons");

  if(ia) show("s-play", `<div class="player"><iframe src="https://archive.org/embed/${encodeURIComponent(ia)}" title="${esc(name)}" allowfullscreen loading="lazy"></iframe></div>
    <p class="chart-note"><a href="https://archive.org/details/${encodeURIComponent(ia)}" ${ext}>Open on the Internet Archive</a></p>`);
  const q = name.replace(/ \((\d{4} )?film\)$/, "");
  show("s-watch", linkRow("Stream & rent", streamLinks(q)) + linkRow("Look up", dbLinks(e)));

  const cast = claimIds(e, "P161"), crew = {dir: dirs, wri: claimIds(e, "P58"), dop: claimIds(e, "P344"), mus: claimIds(e, "P86"), edi: claimIds(e, "P1040"), pro: claimIds(e, "P162").slice(0, 4)};
  const other = [...claimIds(e, "P495"), ...claimIds(e, "P364"), ...claimIds(e, "P136").slice(0, 3), ...claimIds(e, "P135"), ...claimIds(e, "P144").slice(0, 2)];
  const all = [...new Set([...cast.slice(0, 24), ...Object.values(crew).flat(), ...other])];
  describe(all).then(info => {
    if(!alive(ctx)) return;
    const names = (p, n=3) => claimIds(e, p).slice(0, n).map(i => info[i]?.name).filter(Boolean).join(", ");
    const rt = claimStr(e, "P2047");
    setFacts([["Directed by", peopleLinks(dirs, info)], ["Year", esc(year)], ["Starring", peopleLinks(cast, info, 4)],
      ["Cinematography", peopleLinks(crew.dop, info, 2)], ["Music", peopleLinks(crew.mus, info, 2)],
      ["Running time", rt ? esc(Math.round(+rt.amount) + " minutes") : ""], ["Country", esc(names("P495"))], ["Language", esc(names("P364"))],
      ["Genre", esc(names("P136"))], ["Movement", peopleLinks(claimIds(e, "P135"), info)], ["Based on", peopleLinks(claimIds(e, "P144"), info, 2)]]);
    const people = ids => ids.map(i => info[i] && {id: i, ...info[i]}).filter(p => p?.name);
    if(cast.length) show("s-cast", `<div class="faces">${people(cast.slice(0, 24)).map(face).join("")}</div>`);
    const crewFaces = Object.entries(crew).flatMap(([r, ids]) => people(ids).map(p => ({...p, note: ROLE[r]})));
    if(crewFaces.length) show("s-crew", `<div class="faces">${crewFaces.map(face).join("")}</div>`);
    const dname = info[dirs[0]]?.name;
    if(dname) $("s-more").querySelector("h2").textContent = `More by ${dname}`;
    const mov = claimIds(e, "P135")[0];
    if(mov && info[mov]) $("s-mov").querySelector("h2").textContent = `More ${info[mov].name}`;
  }).catch(() => {});

  if(dirs.length) filmsBy(dirs.slice(0, 2), id).then(async rows => {
    const films = filmRows(rows).sort((a, b) => a.year - b.year);
    if(!alive(ctx) || !films.length) return;
    await posters(films.map(f => f.title));
    if(alive(ctx)) show("s-more", `<div class="wall strip">${films.map(poster).join("")}</div>`);
  }).catch(() => {});
  const mov = claimIds(e, "P135")[0];
  if(mov) collection(mov).then(async rows => {
    const films = filmRows(rows).filter(f => f.id !== id).slice(0, 14).sort((a, b) => a.year - b.year);
    if(!alive(ctx) || !films.length) return;
    await posters(films.map(f => f.title));
    if(alive(ctx)) show("s-mov", `<div class="wall strip">${films.map(poster).join("")}</div>`);
  }).catch(() => {});

  gallery(e).then(g => { if(alive(ctx) && g.length) show("s-stills", galleryHtml(g)); }).catch(() => {});
}

/* ---------- a movement or genre: its filmmakers and its films ---------- */
async function collectionPage(ctx){
  const {id, name} = ctx;
  $("views").innerHTML = section("s-career", "Over the years", "Films a year among its best known — point at a bar to see which")
    + section("s-makers", "Filmmakers", "The directors with the most films here")
    + section("s-films", "The films", "Its best-known films, in order");
  let rows;
  try { rows = await collection(id); } catch(err){ rows = []; }
  if(!alive(ctx)) return;
  const films = filmRows(rows);
  if(films.length < 3){
    $("views").innerHTML = `<section class="section"><p class="status">This doesn't look like a film topic. <a href="${ROOT}?t=${encodeURIComponent(name)}&stay">Open it on Myriad's main page</a>, or search for a film, a filmmaker, or a movement.</p></section>`;
    return;
  }
  films.sort((a, b) => a.year - b.year);
  show("s-career", career(films));
  const count = {}; films.forEach(f => f.dirs.forEach(d => count[d] = (count[d] || 0) + 1));
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 14);
  describe(top.map(([d]) => d)).then(info => {
    if(!alive(ctx)) return;
    show("s-makers", `<div class="faces">${top.map(([d, n]) => info[d] && {id: d, ...info[d], note: n + (n === 1 ? " film" : " films")}).filter(p => p?.name).map(face).join("")}</div>`);
  }).catch(() => {});
  show("s-films", wall(films));
  await posters(films.map(f => f.title));
  if(alive(ctx)) show("s-films", wall(films));
}

/* ---------- navigation ---------- */
async function search(q){
  q = q.trim(); if(!q) return;
  document.body.classList.add("on"); shell();
  try {
    const hits = await wikiSearch(q);
    if(!hits.length){ $("lead").innerHTML = `<p class="status">Nothing found for “${esc(q)}”. Try different words.</p>`; return; }
    go(hits[0], hits, q);
  } catch(e){ $("lead").innerHTML = `<p class="status">Couldn't reach Wikipedia right now.</p>`; }
}
function go(title, others=[], query=""){
  history.pushState({title, others, query}, "", "?t=" + encodeURIComponent(title));
  openTopic(title, others, query);
}
function landing(){ token++; document.body.classList.remove("on"); $("q").value = ""; document.title = "Cinema — Myriad"; }
window.addEventListener("popstate", e => {
  if(e.state?.title) openTopic(e.state.title, e.state.others, e.state.query);
  else { const t = new URLSearchParams(location.search).get("t"); t ? openTopic(t) : landing(); }
});
$("f").addEventListener("submit", e => { e.preventDefault(); search($("q").value); });
$("q").addEventListener("search", () => { if(!$("q").value && document.body.classList.contains("on")){ history.pushState(null, "", location.pathname); landing(); } });
/* links to other Cinema topics open in place, without reloading the page */
document.addEventListener("click", e => {
  const a = e.target.closest("a[href^='./?t=']"); if(!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault(); go(new URL(a.getAttribute("href"), location.href).searchParams.get("t"));
});
/* a poster that fails to load becomes a cloth cover */
document.addEventListener("error", e => {
  const img = e.target; if(img.tagName !== "IMG") return;
  if(img.id === "pic") $("plate").hidden = true;
  else if(img.closest(".frame")) img.outerHTML = `<span class="cover">${esc(img.dataset.t || "")}</span>`;
  else if(img.closest(".ph")) img.remove();
}, true);

const p = new URLSearchParams(location.search);
if(p.get("t")) openTopic(p.get("t"));
else if(p.get("q")) search(p.get("q"));
}
