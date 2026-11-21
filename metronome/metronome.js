/* Myriad — Metronome. Topic pages for records, artists, and genres, scenes and labels.
   MusicBrainz gives the discographies, tracklists, credits, bandmates, samples and listening links (one request a second,
   as it asks); the Cover Art Archive gives the covers Wikipedia doesn't have (also one a second); ListenBrainz gives
   similar artists; Wikidata gives awards, influences, genres and labels through its regular API, which stays quick
   when its query service is busy; the Live Music Archive gives concerts to play; Wikipedia gives the words and most pictures. */
{
const {ROOT, esc, WINGS, topicIn} = window.Myriad;
const $ = id => document.getElementById(id);
const ext = `target="_blank" rel="noopener"`;
const W = "https://en.wikipedia.org/w/api.php?format=json&origin=*&";
const WD = "https://www.wikidata.org/w/api.php?format=json&origin=*&";
const CINEMA = WINGS.find(w => w.id === "cinema");
const here = t => `./?t=${encodeURIComponent(t)}`;
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
/* "OK Computer (album)" → "OK Computer"; "Can (band)" → "Can" */
const bare = t => String(t || "").replace(/ \([^)]*\)$/, "");
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const yearIn = s => +(/\b(1[89]\d\d|20\d\d)\b/.exec(s || "") || [])[1] || 0;
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^the /, "").replace(/[^a-z0-9]+/g, "");
let token = 0;

/* types and occupations, from Wikidata */
const RECORD = ["Q482994","Q208569","Q209939","Q169930","Q222910","Q134556","Q7366","Q4176708"];
const ALBUMS = "P31=Q482994|P31=Q208569|P31=Q209939|P31=Q169930";
const GROUP = ["Q215380","Q5741069","Q2088357","Q9212979","Q2491498"];
const MUSIC_JOBS = ["Q639669","Q177220","Q36834","Q488205","Q753110","Q855091","Q486748","Q130857","Q183945","Q158852","Q1259917","Q584301",
  "Q1415090","Q386854","Q12800682","Q806349","Q1075651","Q2252262","Q1327329","Q4351403","Q2643890","Q1643514","Q1198887"];

/* fetch JSON with a time limit, and up to two polite retries if a service says "too many requests" */
const getJSON = async (url, ms = 20000, tries = 3, opts = {}) => {
  const r = await fetch(url, {signal: AbortSignal.timeout(ms), ...opts});
  if(r.status === 429 && tries > 1){ await sleep(1200 * (4 - tries) + Math.random() * 600); return getJSON(url, ms, tries - 1, opts); }
  if(!r.ok) throw new Error(r.status);
  return r.json();
};

/* ---------- Wikidata's API: no more than two requests at a time, a little apart, and a longer wait when it says "too many" ---------- */
let wdBusy = 0, wdAt = 0;
const wdWaiting = [];
const wdSlot = () => new Promise(ok => { wdWaiting.push(ok); wdNext(); });
function wdNext(){
  if(wdBusy >= 2 || !wdWaiting.length) return;
  const wait = Math.max(0, wdAt - Date.now());
  wdBusy++; wdAt = Math.max(Date.now(), wdAt) + 200;
  setTimeout(wdWaiting.shift(), wait);
}
async function wdGet(q){
  for(let i = 0; i < 4; i++){
    await wdSlot();
    try {
      const r = await fetch(WD + q, {signal: AbortSignal.timeout(20000)});
      if(r.ok) return await r.json();
      if(r.status !== 429) throw new Error(r.status);
      /* wait as asked, but never so long that the whole page stalls behind one refusal */
      const after = Math.min(8, +r.headers.get("Retry-After") || 0);
      wdAt = Math.max(wdAt, Date.now() + Math.max(after * 1000, 1500 * 2 ** i));
    } finally { wdBusy--; wdNext(); }
  }
  throw new Error("Wikidata is busy");
}

/* ---------- MusicBrainz: one request a second, every request waiting its turn ---------- */
let mbAt = 0;
const mbCache = new Map();
function mb(path, params = {}){
  const url = "https://musicbrainz.org/ws/2/" + path + "?" + new URLSearchParams({...params, fmt: "json"});
  if(mbCache.has(url)) return mbCache.get(url);
  const p = (async () => {
    for(let i = 0; i < 6; i++){
      const now = Date.now(), at = Math.max(now, mbAt);
      mbAt = at + 1100 + (i ? 1000 * 2 ** i : 0);   /* a busy answer (503) pushes every later request further back */
      if(at > now) await sleep(at - now);
      const r = await fetch(url, {signal: AbortSignal.timeout(20000)}).catch(() => null);
      if(r?.ok) return r.json();
      if(r && r.status !== 503 && r.status !== 429) throw new Error(r.status);
    }
    throw new Error("MusicBrainz is busy");
  })();
  mbCache.set(url, p); p.catch(() => mbCache.delete(url));
  return p;
}
const lucene = s => '"' + String(s).replace(/["\\]/g, " ") + '"';

/* ---------- Wikipedia ---------- */
async function wikiSearch(q, n = 8){
  const j = await getJSON(W + "action=query&list=search&srnamespace=0&srlimit=" + n + "&srsearch=" + encodeURIComponent(q));
  return (j.query?.search || []).map(x => x.title);
}
const summary = t => getJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t.replace(/ /g, "_")));
/* each article's lead picture and one-line description, 50 a request, remembered between pages.
   pilicense=any includes the fair-use album covers that only English Wikipedia hosts. */
const picCache = {};
async function pics(titles){
  const need = [...new Set(titles.filter(t => t && !(t in picCache)))];
  await Promise.all(Array.from({length: Math.ceil(need.length / 50)}, async (_, k) => {
    const batch = need.slice(k * 50, k * 50 + 50);
    try {
      const j = await getJSON(W + "action=query&prop=pageimages|description&piprop=thumbnail&pithumbsize=330&pilicense=any&redirects=1&titles=" + encodeURIComponent(batch.join("|")));
      const back = {};
      for(const m of [...(j.query?.normalized || []), ...(j.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
      batch.forEach(t => picCache[t] = {src: "", desc: ""});
      for(const p of Object.values(j.query?.pages || {})) if(!("missing" in p)) picCache[back[p.title] || p.title] = {src: p.thumbnail?.source || "", desc: p.description || ""};
    } catch(e){}
  }));
  return picCache;
}
const picOf = t => picCache[t]?.src || "";
/* Wikimedia serves thumbnails only at its standard widths */
const bigger = (src, w) => { w = [330, 500, 960, 1280].find(x => x >= w) || 1280; return /\/\d+px-/.test(src) ? src.replace(/\/\d+px-/, `/${w}px-`) : src; };
const commons = (file, w = 330) => file ? "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=" + w : "";

/* ---------- Wikidata, through its regular API ---------- */
const entity = async id => (await wdGet("action=wbgetentities&props=claims|sitelinks&sitefilter=enwiki&ids=" + id)).entities?.[id] || {};
/* full records for a few items (their claims), 50 a request */
async function entities(ids){
  const out = {}, need = [...new Set(ids)].filter(Boolean);
  await Promise.all(Array.from({length: Math.ceil(need.length / 50)}, (_, k) =>
    wdGet("action=wbgetentities&props=claims|labels|sitelinks&languages=en|mul&sitefilter=enwiki&ids=" + need.slice(k * 50, k * 50 + 50).join("|"))
      .then(j => Object.assign(out, j.entities || {})).catch(() => {})));
  return out;
}
/* items that say something (haswbstatement:P175=Q93341 — the records Miles Davis performs on), most relevant first */
async function wdFind(query, n = 100){
  const j = await wdGet("action=query&list=search&srnamespace=0&srprop=&srlimit=" + n + "&srsearch=" + encodeURIComponent(query));
  return {ids: (j.query?.search || []).map(x => x.title), total: j.query?.searchinfo?.totalhits || 0};
}
/* a name, an English Wikipedia article and fame (how many Wikipedias have an article) for each item, 50 a request */
const infoCache = {};
async function wdInfo(ids){
  const need = [...new Set(ids)].filter(i => i && !infoCache[i]);
  await Promise.all(Array.from({length: Math.ceil(need.length / 50)}, (_, k) =>
    wdGet("action=wbgetentities&props=labels|sitelinks|descriptions&languages=en|mul&ids=" + need.slice(k * 50, k * 50 + 50).join("|")).then(j => {
      for(const [id, x] of Object.entries(j.entities || {})) infoCache[id] = {id, name: x.labels?.en?.value || x.labels?.mul?.value || "",
        desc: x.descriptions?.en?.value || "", title: x.sitelinks?.enwiki?.title || "",
        pop: Object.keys(x.sitelinks || {}).filter(s => /wiki$/.test(s) && !/^(commons|species|meta|wikidata)wiki$/.test(s)).length};
    }).catch(() => {})));
  return Object.fromEntries(ids.filter(i => infoCache[i]).map(i => [i, infoCache[i]]));
}
/* the best-known items a search finds, with their names and articles */
async function bestKnown(query, n = 100){
  const {ids, total} = await wdFind(query, n);
  const info = await wdInfo(ids);
  return {total, list: ids.map(i => info[i]).filter(x => x?.name).sort((a, b) => b.pop - a.pop)};
}
/* MusicBrainz ids → Wikidata items (the ones that carry them), matched back by name: {mbid: {id, name, title, pop}} */
async function fromMB(prop, list){
  const out = {}, want = list.filter(x => x.mbid);
  for(let k = 0; k < want.length; k += 20){
    const batch = want.slice(k, k + 20);
    const {ids} = await wdFind("haswbstatement:" + batch.map(x => `${prop}=${x.mbid}`).join("|"), 50).catch(() => ({ids: []}));
    const info = await wdInfo(ids);
    const pool = Object.values(info);
    for(const x of batch){
      const m = pool.find(i => norm(i.name) === norm(x.name)) || pool.find(i => norm(bare(i.title)) === norm(x.name));
      if(m){ out[x.mbid] = m; pool.splice(pool.indexOf(m), 1); }
    }
  }
  return out;
}

/* ---------- claims ---------- */
const live = (e, p) => (e.claims?.[p] || []).filter(c => c.rank !== "deprecated" && c.mainsnak?.datavalue);
const claimIds = (e, p) => live(e, p).map(c => c.mainsnak.datavalue.value?.id).filter(Boolean);
const claimStr = (e, p) => live(e, p)[0]?.mainsnak.datavalue.value;
const claimYear = (e, p) => { const t = claimStr(e, p)?.time; return t ? +t.slice(1, 5) * (t[0] === "-" ? -1 : 1) : 0; };
const claimTime = (e, p) => {
  const v = claimStr(e, p); if(!v?.time) return "";
  const m = v.time.match(/^([+-])(\d+)-(\d\d)-(\d\d)/); if(!m) return "";
  if(v.precision >= 11 && +m[3] && +m[4]) return new Date(Date.UTC(+m[2], +m[3] - 1, +m[4])).toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric", timeZone: "UTC"});
  return String(+m[2]);
};
const isHuman = e => claimIds(e, "P31").includes("Q5");
function kindOf(e){
  const t = claimIds(e, "P31");
  if(t.some(q => RECORD.includes(q)) || claimStr(e, "P436")) return "record";
  /* a person is an artist here when music is among the first few things they're known for (a writer who once played guitar isn't) */
  if(isHuman(e)) return claimIds(e, "P106").slice(0, 3).some(q => MUSIC_JOBS.includes(q)) ? "artist" : "";
  if(t.some(q => GROUP.includes(q)) || claimStr(e, "P434")) return "artist";
  if(t.includes("Q18127") || claimStr(e, "P966")) return "label";
  if(t.includes("Q188451") || claimStr(e, "P8052") || Myriad.wingsFor(e.claims).some(w => w.id === "metronome")) return "genre";
  return "";
}
/* awards and certifications, oldest first: [{id, year}] */
const awards = e => live(e, "P166").map(c => ({id: c.mainsnak.datavalue.value.id, year: +(c.qualifiers?.P585?.[0]?.datavalue?.value?.time || "").slice(1, 5) || 0}))
  .sort((a, b) => (a.year || 9999) - (b.year || 9999));
/* the recognition line under a summary: the big ones first */
const BIG = /Grammy|Mercury Prize|Polar Music|Rock and Roll Hall|Kennedy Center|Pulitzer|Nobel|Brit Award|Ivor Novello|diamond|platinum|Hall of Fame|Album of the Year|Lifetime Achievement|Academy Award|Golden Globe/i;
const honors = (list, info, n = 4) => {
  const named = list.filter(a => info[a.id]?.name).sort((a, b) => (BIG.test(info[b.id].name) - BIG.test(info[a.id].name)) || ((a.year || 9999) - (b.year || 9999)));
  if(!named.length) return "";
  return `<div class="honors"><b>Recognition</b><p class="h-list">${named.slice(0, n).map(a => `<span>${esc(info[a.id].name)}${a.year ? ` <i>${a.year}</i>` : ""}</span>`).join("")}${
    named.length > n ? `<span class="more-h">and ${named.length - n} more</span>` : ""}</p></div>`;
};

/* ---------- covers ---------- */
/* the Cover Art Archive asks for no more than one request a second: its covers load in page order, one a second,
   and only for records Wikipedia has no cover for */
const caa = (rg, size = 250) => rg ? `https://coverartarchive.org/release-group/${rg}/front-${size}` : "";
const caaQ = [], caaAsked = new Set(), caaFailed = new Set();
let caaBusy = false;
function caaPump(){
  if(caaBusy) return;
  caaBusy = true;
  (function tick(){
    let img; while((img = caaQ.shift()) && (!img.isConnected || !img.dataset.caa));
    if(!img){ caaBusy = false; return; }
    const u = img.dataset.caa; img.removeAttribute("data-caa"); caaAsked.add(u); img.src = u;
    setTimeout(tick, 1000);
  })();
}
const caaTake = img => { const u = img.dataset.caa; if(caaAsked.has(u)){ img.removeAttribute("data-caa"); img.src = u; } else caaQ.push(img); };
new MutationObserver(muts => {
  let any = false;
  for(const m of muts) for(const n of m.addedNodes) if(n.nodeType === 1){
    if(n.matches("img[data-caa]")){ caaTake(n); any = true; }
    n.querySelectorAll?.("img[data-caa]").forEach(i => { caaTake(i); any = true; });
  }
  if(any) caaPump();
}).observe(document.documentElement, {childList: true, subtree: true});

/* ---------- small pieces of page ---------- */
const cloth = t => `<span class="cover">${esc(t)}</span>`;
const initials = n => esc(String(n || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join(""));
const coverImg = x => {
  const src = x.img || picOf(x.title);
  if(src) return `<img src="${esc(src)}" alt="" loading="lazy" data-t="${esc(x.name)}">`;
  const c = caa(x.rg);
  return c && !caaFailed.has(c) ? `<img data-caa="${esc(c)}" alt="" data-t="${esc(x.name)}">` : cloth(x.name);
};
const hasCover = x => !!(x.img || picOf(x.title) || (x.rg && !caaFailed.has(caa(x.rg))));
const recHref = x => x.title ? here(x.title) : x.rg ? `./?rg=${x.rg}` : x.id ? "https://www.wikidata.org/wiki/" + x.id : "";
/* a record: its cover, its name, and who made it or when */
const rec = (x, note) => {
  const n = note !== undefined ? note : [x.by, x.year].filter(Boolean).join(" · ");
  const href = recHref(x), out = !x.title && !x.rg;
  return `<a class="poster rec" ${href ? `href="${esc(href)}"` : ""}${out && href ? ` ${ext}` : ""} data-name="${esc(x.name + (x.by ? " — " + x.by : ""))}"><div class="frame">${coverImg(x)}</div>
    <div class="cap"><span class="t">${esc(x.name)}</span>${n ? `<span class="y">${esc(n)}</span>` : ""}</div></a>`;
};
const strip = (list, note) => list.length ? `<div class="wall strip mt-strip">${list.map(x => rec(x, typeof note === "function" ? note(x) : note)).join("")}</div>` : "";
/* a person or band: their picture (in black and white until pointed at), name, and a line about them */
const faceHref = p => p.title ? here(p.title) : p.mbid ? "https://musicbrainz.org/artist/" + p.mbid : p.id ? "https://www.wikidata.org/wiki/" + p.id : "";
const face = p => {
  const src = p.img || picOf(p.title), href = faceHref(p);
  return `<a class="face" ${href ? `href="${esc(href)}"` : ""}${p.title ? "" : ` ${ext}`}><div class="ph">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<span class="initials">${initials(p.name)}</span>`}</div>
    <div class="cap"><span class="t">${esc(p.name)}</span>${p.note ? `<span class="y">${esc(p.note)}</span>` : ""}</div></a>`;
};
const faces = list => list.length ? `<div class="faces">${list.map(face).join("")}</div>` : "";
const section = (id, label, sub = "") => `<section class="section" id="${id}" hidden><h2 class="label">${esc(label)}</h2>${sub ? `<p class="sub">${sub}</p>` : ""}<div class="body"></div></section>`;
const show = (id, html) => { const s = $(id); if(!s || !html) return; s.querySelector(".body").innerHTML = html; s.hidden = false; };
const linkRow = (title, links) => links.length ? `<p class="watch"><b>${esc(title)}</b>${links.map(([t, u]) => `<a href="${esc(u)}" ${ext}>${esc(t)}</a>`).join("")}</p>` : "";
/* the "show all" switch under a long list: the best-known ~40, the rest on request */
function capped(host, items, render, {n = 40, what = ""} = {}){
  let all = false;
  const draw = () => {
    host.innerHTML = render(all ? items : items.slice(0, n), all) + (items.length > n ? `<p class="wall-more mt-more"><button type="button" class="linkish" data-all>${all
      ? "Show only the best known" : `These are the ${n} best known — show all ${items.length}${what ? " " + what : ""}`}</button></p>` : "");
  };
  host.onclick = e => { if(e.target.closest("[data-all]")){ all = !all; draw(); if(!all) host.scrollIntoView({block: "nearest"}); } };
  draw();
}
/* records grouped by decade, oldest first */
function wall(list){
  const by = {};
  for(const x of list) (by[x.year ? Math.floor(x.year / 10) * 10 + "s" : "Undated"] ||= []).push(x);
  return Object.entries(by).sort(([a], [b]) => a === "Undated" ? 1 : b === "Undated" ? -1 : a.localeCompare(b))
    .map(([d, xs]) => `<div class="decade"><h3>${esc(d)}</h3><div class="wall mt-wall">${xs.map(x => rec(x, x.year ? String(x.year) : "")).join("")}</div></div>`).join("");
}
/* releases a year: one bar per year, a tooltip naming that year's records */
function perYear(list, what = "records"){
  const dated = list.filter(x => x.year);
  if(dated.length < 3) return "";
  const lo = Math.min(...dated.map(x => x.year)), hi = Math.max(...dated.map(x => x.year));
  const per = {}; dated.forEach(x => (per[x.year] ||= []).push(x.name));
  const max = Math.max(...Object.values(per).map(x => x.length));
  const years = Array.from({length: hi - lo + 1}, (_, i) => lo + i);
  const ticks = years.filter(y => y % 10 === 0 || y === lo);
  const busiest = Object.entries(per).sort((a, b) => b[1].length - a[1].length)[0];
  return `<div class="career" role="img" aria-label="${esc(`${dated.length} ${what} from ${lo} to ${hi}; busiest year ${busiest[0]} with ${busiest[1].length}`)}">
    <div class="bars" style="--n:${years.length}">${years.map(y => `<div class="yr" data-y="${y}" data-films="${esc((per[y] || []).join("|"))}">${
      per[y] ? `<i style="height:${Math.max(6, per[y].length / max * 100)}%"></i>` : ""}</div>`).join("")}</div>
    <div class="axis" style="--n:${years.length}">${ticks.map(y => `<span style="--i:${y - lo}">${y}</span>`).join("")}</div>
    <p class="chart-note">${dated.length} ${what}, ${lo}–${hi} · busiest year ${busiest[0]} (${busiest[1].length})</p></div>`;
}
/* one tooltip, shared by the chart and the web */
const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; document.body.append(tip);
const placeTip = (e, html) => {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect(), x = Math.min(innerWidth - r.width - 8, Math.max(8, e.clientX - r.width / 2));
  tip.style.left = x + "px"; tip.style.top = Math.max(8, e.clientY - r.height - 14) + "px";
};
document.addEventListener("pointermove", e => {
  if(!document.body.classList.contains("on")) return;
  const y = e.target.closest?.(".yr"), n = e.target.closest?.(".node");
  if(y){ const xs = y.dataset.films ? y.dataset.films.split("|") : [];
    placeTip(e, `<b>${y.dataset.y}</b>${xs.length ? xs.map(f => `<span>${esc(f)}</span>`).join("") : `<span class="none">Nothing released</span>`}`); }
  else if(n) placeTip(e, `<b>${esc(n.dataset.name)}</b><span class="none">${esc(n.dataset.note)}</span>${(n.dataset.films || "").split("|").filter(Boolean).slice(0, 8).map(f => `<span>${esc(f)}</span>`).join("")}`);
  else tip.hidden = true;
});
document.addEventListener("scroll", () => tip.hidden = true, {passive: true});

/* bandmates and collaborators as a web: the artist in the middle, the others around, each line as thick as what they share */
function web(center, people){
  /* fewer than five makes a lopsided drawing: the list beside it says it better alone */
  const ps = people.slice(0, 14); if(ps.length < 5) return "";
  const Wd = 900, H = 640, cx = Wd / 2, cy = H / 2, max = Math.max(...ps.map(p => p.n));
  const nodes = ps.map((p, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / ps.length;
    return {...p, x: cx + Math.cos(a) * 340, y: cy + Math.sin(a) * 236, r: 20 + 16 * p.n / max, up: Math.sin(a) < -0.2};
  });
  const clip = (id, x, y, r) => `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath>`;
  const disc = (id, x, y, r, src, name) => src
    ? `<image href="${esc(src)}" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
    : `<text x="${x}" y="${y + 5}" class="ini">${initials(name)}</text>`;
  return `<svg class="web" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(`The people ${center.name} played and recorded with most`)}">
    <defs>${clip("c0", cx, cy, 46)}${nodes.map((n, i) => clip("c" + (i + 1), n.x, n.y, n.r)).join("")}</defs>
    ${nodes.map(n => `<line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" style="stroke-width:${1 + 7 * n.n / max}"/>`).join("")}
    <circle class="disc" cx="${cx}" cy="${cy}" r="48"/>${disc("c0", cx, cy, 46, center.img, center.name)}
    ${nodes.map((n, i) => { const href = faceHref(n); return `<a ${href ? `href="${esc(href)}"` : ""}${n.title ? "" : ` ${ext}`} class="node" data-name="${esc(n.name)}" data-note="${esc(n.note)}" data-films="${esc(n.films || "")}">
      <circle class="disc" cx="${n.x}" cy="${n.y}" r="${n.r + 2}"/>${disc("c" + (i + 1), n.x, n.y, n.r, n.img || picOf(n.title), n.name)}
      ${n.up ? `<text x="${n.x}" y="${n.y - n.r - 26}" class="nm">${esc(n.name)}</text><text x="${n.x}" y="${n.y - n.r - 9}" class="ct">${esc(n.ct)}</text>`
        : `<text x="${n.x}" y="${n.y + n.r + 22}" class="nm">${esc(n.name)}</text><text x="${n.x}" y="${n.y + n.r + 39}" class="ct">${esc(n.ct)}</text>`}</a>`; }).join("")}
  </svg>`;
}

/* before & after: what came before, the thing itself, what came after. A column with nothing in it isn't drawn. */
const beforeAfter = (from, me, to, item) => {
  const col = (label, list) => list.length ? `<div class="ba-col"><h3 class="minor">${label}</h3><div class="ba-list">${list.map(x => `<div class="ba-item">${item(x)}<span class="ba-how">${esc(x.how)}</span></div>`).join("")}</div></div>` : `<div class="ba-col"></div>`;
  return `<div class="before-after mt-ba${from.length ? "" : " no-from"}${to.length ? "" : " no-to"}">${col("Came from", from)}
    <div class="ba-this">${from.length ? `<span class="ba-arrow" aria-hidden="true">→</span>` : ""}${me}${to.length ? `<span class="ba-arrow" aria-hidden="true">→</span>` : ""}</div>${col("Led to", to)}</div>`;
};

/* ---------- the made-ahead data: the best-known records of every year ---------- */
let DATA = null;
const data = () => DATA ||= fetch("data.json?v=" + (document.querySelector('script[src*="metronome.js"]')?.src.split("v=")[1] || "1"))
  .then(r => r.ok ? r.json() : null).then(j => {
    if(!j?.years) return null;
    for(const y of Object.keys(j.years)) j.years[y] = j.years[y].map(([title, name, by, pop]) => ({title, name: name || bare(title), by, pop, year: +y}));
    return j;
  }).catch(() => null);
/* the best-known records of a year: from the data file, or else asked of Wikidata's query service */
async function ofYear(y){
  const j = await data();
  if(j?.years?.[y]) return j.years[y];
  const q = `SELECT ?al ?alLabel (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) (SAMPLE(?pl) AS ?by) WHERE {
    VALUES ?t { wd:Q482994 wd:Q208569 } ?al wdt:P31 ?t ; wdt:P577 ?d ; wikibase:sitelinks ?sl . FILTER(?sl >= 8)
    FILTER(?d >= "${y}-01-01T00:00:00Z"^^xsd:dateTime && ?d < "${+y + 1}-01-01T00:00:00Z"^^xsd:dateTime)
    ?art schema:about ?al ; schema:isPartOf <https://en.wikipedia.org/> .
    OPTIONAL { ?al wdt:P175 ?p . ?p rdfs:label ?pl . FILTER(LANG(?pl) = "en" || LANG(?pl) = "mul") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". } } GROUP BY ?al ?alLabel ORDER BY DESC(?pop) LIMIT 40`;
  const j2 = await getJSON("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), 25000, 1, {headers: {"Api-User-Agent": "Myriad/1.0 (https://prntwrld.github.io/myriad/)"}});
  return j2.results.bindings.map(b => { const t = decodeURIComponent(b.a.value.replace(/^.*\/wiki\//, "")).replace(/_/g, " ");
    return {title: t, name: b.alLabel?.value || bare(t), by: b.by?.value || "", pop: +b.pop.value, year: +y}; });
}

/* ---------- the Live Music Archive ---------- */
const lmaQ = name => `collection:etree AND creator:(${lucene(name)})`;
async function liveShows(name, n = 8){
  const j = await getJSON("https://archive.org/advancedsearch.php?fl[]=identifier&fl[]=title&fl[]=date&fl[]=venue&fl[]=coverage&fl[]=creator&sort[]=downloads+desc&output=json&rows=" + n
    + "&q=" + encodeURIComponent(lmaQ(name)), 15000);
  return {count: j.response?.numFound || 0, shows: (j.response?.docs || []).map(d => ({id: d.identifier, title: d.title, date: (d.date || "").slice(0, 10),
    venue: [].concat(d.venue || [])[0] || "", place: [].concat(d.coverage || [])[0] || "", by: [].concat(d.creator || [])[0] || name}))};
}
const mmss = s => { s = Math.round(s || 0); return s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : ""; };
const secs = v => { if(!v) return 0; if(/:/.test(v)) return String(v).split(":").reduce((a, b) => a * 60 + +b, 0); return +v || 0; };
/* a show's tracks, if the Archive still has them to play (it's asked first, so a show taken down is never offered) */
async function showTracks(id){
  const j = await getJSON("https://archive.org/metadata/" + encodeURIComponent(id), 15000);
  if(!j?.files || j.is_dark) return [];
  const pick = re => j.files.filter(f => re.test(f.format || "") && f.source !== "metadata");
  let files = pick(/^VBR MP3$/); if(!files.length) files = pick(/MP3/); if(!files.length) files = pick(/Ogg Vorbis/);
  const num = f => +(f.track || "").split("/")[0] || 0;
  files.sort((a, b) => (num(a) - num(b)) || a.name.localeCompare(b.name, undefined, {numeric: true}));
  return files.map(f => ({src: `https://archive.org/download/${encodeURIComponent(id)}/${f.name.split("/").map(encodeURIComponent).join("/")}`,
    name: f.title || f.name.replace(/^.*\//, "").replace(/\.\w+$/, ""), dur: secs(f.length)}));
}
/* a list of tracks that plays one after another */
const AUDIO = new Audio(); AUDIO.preload = "none";
const ICON_PLAY = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>`;
const ICON_PAUSE = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor"/></svg>`;
let current = null;
function trackList(host, tracks){
  const list = {host, tracks};
  host.innerHTML = `<ol class="fg-tracks mt-tracks">${tracks.map((t, i) => `<li class="fg-track" data-i="${i}">
      <button type="button" class="fg-play" data-play="${i}" aria-label="Play ${esc(t.name)}">${ICON_PLAY}</button>
      <div class="fg-tr-text"><span class="fg-tr-name">${esc(t.name)}</span><span class="fg-tr-bar"><i></i></span></div>
      <span class="fg-tr-time">${mmss(t.dur)}</span></li>`).join("")}</ol>`;
  host.onclick = e => { const b = e.target.closest("[data-play]"); if(b) play(list, +b.dataset.play); };
  return {playAll: () => play(list, 0, true), list};
}
function mark(){
  document.querySelectorAll(".mt-tracks .fg-track.on").forEach(li => { li.classList.remove("on"); li.querySelector(".fg-play").innerHTML = ICON_PLAY; });
  if(!current) return;
  const li = current.list.host.querySelector(`.fg-track[data-i="${current.i}"]`); if(!li) return;
  li.classList.add("on"); li.querySelector(".fg-play").innerHTML = AUDIO.paused ? ICON_PLAY : ICON_PAUSE;
  document.dispatchEvent(new CustomEvent("mt-play", {detail: {playing: !AUDIO.paused, list: current.list}}));
}
function play(list, i, fresh = false){
  if(!fresh && current?.list === list && current.i === i){ AUDIO.paused ? AUDIO.play().catch(() => {}) : AUDIO.pause(); return; }
  const t = list.tracks[i]; if(!t) return;
  current = {list, i}; AUDIO.src = t.src; AUDIO.play().catch(() => {}); mark();
}
AUDIO.addEventListener("play", mark); AUDIO.addEventListener("pause", mark);
AUDIO.addEventListener("timeupdate", () => {
  if(!current) return;
  const bar = current.list.host.querySelector(`.fg-track[data-i="${current.i}"] .fg-tr-bar i`);
  if(bar && AUDIO.duration) bar.style.width = (AUDIO.currentTime / AUDIO.duration * 100) + "%";
});
/* a show plays straight through, track after track */
AUDIO.addEventListener("ended", () => { if(current && current.i + 1 < current.list.tracks.length && current.list.host.isConnected) play(current.list, current.i + 1, true); });
const stop = () => { AUDIO.pause(); current = null; mark(); };

/* ---------- the page ---------- */
const TOPIC = $("mtopic");
function shell(){
  TOPIC.innerHTML = `<div class="hero">
      <article class="lead" id="lead"><p class="status">Looking it up…</p></article>
      <aside class="side"><figure class="plate" id="plate" hidden><img class="pic" id="pic" alt=""></figure>
        <div class="facts" id="facts" hidden><h2 class="label">Quick facts</h2><dl id="factlist"></dl></div></aside></div>
    <div id="views"></div><div id="mshelves"></div>`;
}
const alive = ctx => ctx.my === token;
const setFacts = rows => {
  rows = rows.filter(r => r[1]); if(!rows.length) return;
  $("factlist").innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join(""); $("facts").hidden = false;
};
const linkTo = x => x ? (x.title ? `<a href="${esc(here(x.title))}">${esc(x.name || bare(x.title))}</a>` : esc(x.name)) : "";
const links = (ids, info, n = 3) => ids.slice(0, n).map(i => info[i]?.name ? linkTo(info[i]) : "").filter(Boolean).join(", ");
const lead = (name, s, others, title) => {
  const otherLinks = others.filter(o => o !== title && o !== name).slice(0, 5);
  $("lead").innerHTML = `<h1>${esc(bare(name))}</h1>
    ${s.description ? `<p class="desc">${esc(cap(s.description))}</p>` : ""}
    <p class="extract">${esc(s.extract || "")}</p>
    <p class="readon"><b>Read more</b><span id="readon"><a href="${esc(s.content_urls?.desktop?.page || "https://en.wikipedia.org/wiki/" + encodeURIComponent(name))}" ${ext}>Wikipedia</a></span></p>
    ${otherLinks.length ? `<p class="others">Did you mean: ${otherLinks.map(o => `<a href="${here(o)}">${esc(o)}</a>`).join(" · ")}</p>` : ""}`;
};
const setPic = (src, cls = "", small = "") => { if(!src) return; $("pic").dataset.small = small && small !== src ? small : ""; $("pic").src = src; $("plate").className = "plate" + (cls ? " " + cls : ""); $("plate").hidden = false; };
const addReadon = html => $("readon")?.insertAdjacentHTML("beforeend", html);
const addHonors = html => html && $("readon")?.closest(".readon")?.insertAdjacentHTML("beforebegin", html);

async function openTopic(title, others = [], query = ""){
  const my = ++token;
  document.body.classList.add("on"); window.scrollTo(0, 0); tip.hidden = true;
  $("q").value = query || title;
  shell();
  let s;
  try { s = await summary(title); } catch(e){ if(my === token) $("lead").innerHTML = `<p class="status">Couldn't load that. Try again in a moment, or try another search.</p>`; return; }
  if(my !== token) return;
  const name = s.title || title, disamb = s.type === "disambiguation";
  let e = null;
  if(s.wikibase_item && !disamb){ try { e = await entity(s.wikibase_item); } catch(err){} if(my !== token) return; }
  const kind = e ? kindOf(e) : "";
  /* not about music (Mercury the planet, a name with many meanings): Myriad's general page takes it, with a way back here */
  if(!kind && (e || disamb || !s.wikibase_item)){
    location.replace(`${ROOT}?t=${encodeURIComponent(name)}&stay&from=metronome`); return;
  }
  document.title = bare(name) + " — Metronome — Myriad";
  lead(name, s, others, title);
  const thumb = s.thumbnail?.source, orig = s.originalimage;
  const img = thumb && orig?.width > 720 && /\/\d+px-/.test(thumb) ? thumb.replace(/\/\d+px-/, "/720px-") : orig?.source || thumb;
  if(img && kind !== "record") setPic(img, "", thumb);
  else if(kind && kind !== "record"){ await pics([name]); if(my !== token) return; if(picOf(name)) setPic(bigger(picOf(name), 500), "", picOf(name)); }
  Myriad.shelves?.render($("mshelves"), {title: name, description: s.description, short: bare(name)});
  if(!e) return;
  const ctx = {my, id: s.wikibase_item, name, short: bare(name), e, kind, img: thumb || "", desc: s.description || ""};
  const trailAdd = src => Myriad.discover?.trail.add({wing: "metronome", title: name, name: ctx.short, img: src || thumb || ""});
  trailAdd();
  addReadon(`<a class="drift-here" href="./?drift=${s.wikibase_item}&k=${kind}&name=${encodeURIComponent(name)}">Drift from here</a>`);
  if(kind === "record"){
    /* the cover: Wikipedia's summary leaves out fair-use covers, so ask for the lead image directly; else the Cover Art Archive */
    await pics([name]);
    if(!alive(ctx)) return;
    const src = picOf(name) ? bigger(picOf(name), 500) : img;
    if(src){ setPic(src, "is-cover", picOf(name)); trailAdd(picOf(name) || img); }
    else if(claimStr(e, "P436")){ setPic(caa(claimStr(e, "P436"), 500), "is-cover"); ctx.caaPlate = true; }
    return recordPage(ctx);
  }
  if(kind === "artist") return artistPage(ctx);
  return collectionPage(ctx);
}

/* ---------- a record ---------- */
const ROLE = {producer: "producer", engineer: "engineer", "recording": "recording engineer", mix: "mixing", mastering: "mastering",
  arranger: "arranger", orchestrator: "orchestration", conductor: "conductor", "performing orchestra": "orchestra", "chorus master": "chorus master",
  programming: "programming", composer: "composer", lyricist: "lyrics", writer: "songwriter", "design/illustration": "design", design: "design",
  illustration: "illustration", photography: "photography", "liner notes": "liner notes", "art direction": "art direction", "remixer": "remix", "instrument arranger": "arranger",
  "vocal arranger": "vocal arrangement", "audio": "sound", "sound": "sound", "editor": "editing", "balance": "balance engineer"};
const PLAYS = new Set(["instrument", "vocal", "performer", "performing orchestra", "conductor"]);
const roleOf = r => r.type === "instrument" ? (r.attributes || []).filter(a => !/^(additional|guest|solo|minor)$/.test(a)).join(", ") || "instruments"
  : r.type === "vocal" ? ((r.attributes || []).filter(a => !/^(additional|guest|solo)$/.test(a)).join(", ") || "vocals")
  : r.type === "performer" ? "performer" : ROLE[r.type] || "";

/* which release of a record to read the tracks and credits from: the first, in full, on its first day if possible */
async function bestRelease(rg, first){
  const j = await mb("release", {"release-group": rg, status: "official", limit: 100, inc: "media"});
  const rs = j.releases || [];
  if(!rs.length) return null;
  const score = r => (first && r.date === first ? 4 : 0) + ((r.date || "").length === 10 ? 1 : 0) + (["XW", "US", "GB", "XE"].includes(r.country) ? 1 : 0)
    + ((r.media || []).every(m => /CD|Digital/.test(m.format || "")) ? 0.5 : 0) - (r.media || []).length * 0.1;
  rs.sort((a, b) => score(b) - score(a) || (a.date || "9999").localeCompare(b.date || "9999"));
  return mb("release/" + rs[0].id, {inc: "recordings+artist-credits+labels+artist-rels+recording-level-rels+work-level-rels+work-rels+recording-rels+url-rels+release-groups+release-group-level-rels"});
}
const credit = ac => (ac || []).map(a => (a.name || a.artist?.name || "") + (a.joinphrase || "")).join("").trim();

async function recordPage(ctx){
  const {e, id, name} = ctx;
  const year = claimYear(e, "P577") || "";
  const perf = claimIds(e, "P175");
  $("views").innerHTML = section("s-tracks", "Tracklist")
    + section("s-credits", "Credits", "The people on the record")
    + section("s-line", "Before & after", "What it drew on, and what drew on it")
    + section("s-year", year ? `Also in ${year}` : "Also from its time", "The year's best-known records")
    + section("s-more", "More by the artist", "Their best-known records")
    + section("s-listen", "Listen");
  const prod = claimIds(e, "P162"), labels = claimIds(e, "P264"), genres = claimIds(e, "P136"), studios = claimIds(e, "P483"), partOf = claimIds(e, "P361");
  /* the record before and after it, said directly or as qualifiers on "part of [the artist's albums in order]" */
  const series = live(e, "P361").flatMap(c => [["prev", c.qualifiers?.P155], ["next", c.qualifiers?.P156]]).filter(([, q]) => q?.[0]?.datavalue?.value?.id)
    .map(([k, q]) => [k, q[0].datavalue.value.id]);
  const prev = claimIds(e, "P155")[0] || series.find(([k]) => k === "prev")?.[1], next = claimIds(e, "P156")[0] || series.find(([k]) => k === "next")?.[1];
  const won = awards(e);
  const infoP = wdInfo([...perf, ...prod, ...labels, ...genres.slice(0, 4), ...studios, ...partOf, ...won.slice(0, 30).map(a => a.id), prev, next, ...claimIds(e, "P737")].filter(Boolean));
  const artist = infoP.then(info => info[perf[0]]);

  infoP.then(info => {
    if(!alive(ctx)) return;
    addHonors(honors(won, info));
    const albumOf = partOf.map(i => info[i]).filter(x => x?.title && !/albums in chronological order|discography/i.test(x.name));
    ctx.facts = () => setFacts([["By", links(perf, info)], ["Released", esc(claimTime(e, "P577"))], ["Recorded at", links(studios, info, 2)], ["Label", links(labels, info, 2)],
      ["Producer", links(prod, info)], ["Genre", links(genres, info)], ["From", albumOf.slice(0, 1).map(linkTo).join("")], ["Length", ctx.minutes ? `${ctx.minutes} minutes` : ""]]);
    ctx.facts();
    const a = info[perf[0]];
    if(a?.name) $("s-more").querySelector("h2").textContent = `More by ${bare(a.name)}`;
  }).catch(() => {});

  /* MusicBrainz: the release group (from Wikidata, or found by name and artist), and one release of it */
  let rg = claimStr(e, "P436");
  if(!rg){
    const a = await artist.catch(() => null);
    const j = await mb("release-group/", {query: `releasegroup:${lucene(ctx.short)}` + (a?.name ? ` AND artist:${lucene(a.name)}` : ""), limit: 3}).catch(() => null);
    const g = j?.["release-groups"]?.find(g => g.score >= 90 && norm(g.title) === norm(ctx.short));
    rg = g?.id || "";
  }
  if(!alive(ctx)) return;
  const release = rg ? await bestRelease(rg, "").catch(() => null) : null;
  if(!alive(ctx)) return;
  if(release){
    tracklist(ctx, release);
    credits(ctx, release, e);
  } else wdCredits(ctx, e, infoP);
  recordLineage(ctx, release, {prev, next, infoP});
  if(year) alsoIn(ctx, year, "s-year", [name]);
  moreBy(ctx, perf[0], name);
  recordListen(ctx, release, await artist.catch(() => null));
  /* a cover the Cover Art Archive has but Wikipedia doesn't: try the first release's own, if the group's has none */
  if(ctx.caaPlate && release) caaPlateFallback(release);
}

function caaPlateFallback(release){
  const pic = $("pic"), alt = `https://coverartarchive.org/release/${release.id}/front-500`;
  if($("plate").hidden){ $("plate").hidden = false; pic.src = alt; }
  else pic.onerror = () => { pic.onerror = null; pic.src = alt; };
}
function tracklist(ctx, release){
  const media = (release.media || []).filter(m => m.tracks?.length);
  if(!media.length) return;
  let total = 0;
  const html = media.map((m, k) => {
    const head = media.length > 1 ? `<h3 class="minor">${esc(m.title || (m.format && /Vinyl|Cassette/.test(m.format) ? `${m.format} ${m.position}` : `Disc ${m.position}`))}</h3>` : "";
    return head + `<ol class="mt-tl">${m.tracks.map(t => {
      total += t.length || 0;
      const works = (t.recording?.relations || []).filter(r => r["target-type"] === "work").map(r => r.work);
      const writers = [...new Set(works.flatMap(w => (w.relations || []).filter(r => ["composer", "writer", "lyricist"].includes(r.type)).map(r => r.artist?.name)).filter(Boolean))];
      const by = credit(t["artist-credit"]), main = credit(release["artist-credit"]);
      return `<li><span class="n">${esc(t.number || t.position)}</span><span class="tt">${esc(t.title)}${by && by !== main ? ` <i>— ${esc(by)}</i>` : ""}${writers.length ? `<span class="w">${esc(writers.join(", "))}</span>` : ""}</span><span class="d">${mmss((t.length || 0) / 1000)}</span></li>`;
    }).join("")}</ol>`;
  }).join("");
  show("s-tracks", `<div class="mt-tracklist">${html}</div>`);
  if(total){ ctx.minutes = Math.round(total / 60000); ctx.facts?.(); }
}

/* everyone credited, from the release and every track: what they did, on how many tracks */
async function credits(ctx, release, e){
  const people = new Map(), tracks = (release.media || []).flatMap(m => m.tracks || []);
  const add = (r, track) => {
    const a = r.artist; if(!a?.id) return;
    const role = roleOf(r); if(!role) return;
    const p = people.get(a.id) || {mbid: a.id, name: a.name, roles: new Map(), tracks: new Set(), plays: false};
    p.roles.set(role, (p.roles.get(role) || 0) + 1);
    if(track) p.tracks.add(track);
    if(PLAYS.has(r.type)) p.plays = true;
    people.set(a.id, p);
  };
  for(const r of release.relations || []) if(r["target-type"] === "artist") add(r, "");
  for(const t of tracks) for(const r of t.recording?.relations || []){
    if(r["target-type"] === "artist") add(r, t.id);
    if(r["target-type"] === "work") for(const w of r.work?.relations || []) if(w["target-type"] === "artist") add(w, t.id);
  }
  let list = [...people.values()];
  if(!list.length) return wdCredits(ctx, e, wdInfo([...claimIds(e, "P162"), ...claimIds(e, "P175"), ...claimIds(e, "P767")]));
  const weight = p => (p.plays ? 3 : 1) * Math.max(1, p.tracks.size) + (p.roles.has("producer") ? 12 : 0) + (p.roles.has("composer") ? 2 : 0);
  list.sort((a, b) => weight(b) - weight(a));
  const map = await fromMB("P434", list.slice(0, 40)).catch(() => ({}));
  await pics(Object.values(map).map(x => x.title));
  if(!alive(ctx)) return;
  const roleText = p => [...p.roles.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r).slice(0, 4).join(", ");
  list = list.map(p => ({...p, ...(map[p.mbid] ? {id: map[p.mbid].id, title: map[p.mbid].title} : {}), name: p.name, note: roleText(p)}));
  const pictured = list.filter(p => picOf(p.title)).slice(0, 16);
  const rows = list.map(p => `<li><a href="${esc(faceHref(p))}"${p.title ? "" : ` ${ext}`}>${esc(p.name)}</a><span class="role">${esc(roleText(p))}</span>${
    p.tracks.size && p.tracks.size < tracks.length ? `<span class="n">${p.tracks.size}</span>` : ""}</li>`);
  const host = $("s-credits");
  host.hidden = false;
  capped(host.querySelector(".body"), rows, l => (pictured.length >= 2 ? faces(pictured) : "") + `<ol class="ranked mt-credits">${l.join("")}</ol>`, {n: 30, what: "credits"});
  /* the people on it fill the space under the cover when the words beside it run longer */
  Myriad.sideFill?.(pictured.slice(0, 12).map(p => ({src: picOf(p.title), name: p.name, title: `${p.name} — ${p.note}`, href: here(p.title), internal: true, person: true})));
}
/* credits from Wikidata when MusicBrainz has none: the producers, performers and contributors it lists */
async function wdCredits(ctx, e, infoP){
  const info = await infoP.catch(() => ({}));
  const who = [...claimIds(e, "P175").map(i => [i, "performer"]), ...claimIds(e, "P162").map(i => [i, "producer"]), ...claimIds(e, "P767").map(i => [i, "contributor"])]
    .filter(([i]) => info[i]?.name);
  if(!who.length) return;
  await pics(who.map(([i]) => info[i].title));
  if(alive(ctx)) show("s-credits", faces(who.map(([i, r]) => ({...info[i], note: r}))));
}

/* samples: what its tracks drew on, and the tracks that drew on it; then influences; then, failing those, the records either side of it */
async function recordLineage(ctx, release, {prev, next, infoP}){
  const {e, id, name} = ctx;
  const from = [], to = [], recs = new Map();
  for(const t of (release?.media || []).flatMap(m => m.tracks || [])) for(const r of t.recording?.relations || []){
    if(r.type !== "samples material" || r["target-type"] !== "recording" || !r.recording?.id) continue;
    const key = r.recording.id, side = r.direction === "backward" ? "to" : "from";
    if(!recs.has(key)) recs.set(key, {rid: key, side, song: r.recording.title, by: credit(r.recording["artist-credit"]), track: t.title});
  }
  const sampled = [...recs.values()];
  /* the records those recordings came out on, in one search */
  const ofRec = {};
  for(let k = 0; k < Math.min(sampled.length, 48); k += 24){
    const batch = sampled.slice(k, k + 24);
    const j = await mb("recording/", {query: "rid:(" + batch.map(x => x.rid).join(" OR ") + ")", limit: 100}).catch(() => null);
    for(const r of j?.recordings || []){
      const rels = (r.releases || []).filter(x => x["release-group"]);
      const good = rels.filter(x => !(x["release-group"]["secondary-types"] || []).some(s => /Compilation|DJ-mix|Mixtape/.test(s)));
      const first = (good.length ? good : rels).sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"))[0];
      if(first) ofRec[r.id] = {rg: first["release-group"].id, name: first["release-group"].title, year: yearIn(first.date)};
    }
  }
  if(!alive(ctx)) return;
  const seen = new Set();
  for(const x of sampled){
    const g = ofRec[x.rid]; if(!g || seen.has(g.rg)) continue;
    seen.add(g.rg);
    (x.side === "from" ? from : to).push({rg: g.rg, name: g.name, by: x.by, year: g.year, how: x.side === "from" ? `sampled in ${x.track}` : `samples ${x.track}`});
  }
  /* influences Wikidata knows of, either way */
  const infl = claimIds(e, "P737"), later = (await wdFind("haswbstatement:P737=" + id, 12).catch(() => ({ids: []}))).ids;
  const info = {...await infoP.catch(() => ({})), ...await wdInfo([...infl, ...later])};
  for(const i of infl) if(info[i]?.name) from.unshift({id: i, name: info[i].name, title: info[i].title, how: "an influence", pop: info[i].pop});
  for(const i of later) if(info[i]?.name) to.unshift({id: i, name: info[i].name, title: info[i].title, how: "influenced by it", pop: info[i].pop});
  if(!from.length && info[prev]?.name) from.push({id: prev, name: info[prev].name, title: info[prev].title, how: "the record before"});
  if(!to.length && info[next]?.name) to.push({id: next, name: info[next].name, title: info[next].title, how: "the record after"});
  if(!from.length && !to.length) return;
  /* pictures: Wikipedia's covers for the records Wikidata knows, the Cover Art Archive's for the rest */
  const rgs = [...from, ...to].filter(x => x.rg && !x.title);
  const map = await fromMB("P436", rgs.map(x => ({mbid: x.rg, name: x.name}))).catch(() => ({}));
  for(const x of rgs) if(map[x.rg]?.title){ x.title = map[x.rg].title; x.pop = map[x.rg].pop; }
  /* the best-known, with a picture, first; no more than eight a side, and one per artist where there's choice */
  const pick = list => {
    const sorted = list.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0));
    const byArtist = new Set(), first = [], rest = [];
    for(const x of sorted) (x.by && byArtist.has(x.by) ? rest : (byArtist.add(x.by), first)).push(x);
    return [...first, ...rest].slice(0, 8).sort((a, b) => (a.year || 9999) - (b.year || 9999));
  };
  const f = pick(from), t = pick(to);
  await pics([name, ...[...f, ...t].map(x => x.title)]);
  if(!alive(ctx)) return;
  const me = rec({title: name, name: ctx.short, img: picOf(name) || (ctx.caaPlate ? $("pic").src : ""), rg: claimStr(e, "P436")}, "");
  show("s-line", beforeAfter(f, me, t, x => rec(x, [x.by, x.year].filter(Boolean).join(" · "))));
}

/* the best-known records of a year, leaving out some */
async function alsoIn(ctx, y, sec, not = []){
  const list = (await ofYear(y).catch(() => [])).filter(x => !not.includes(x.title));
  if(list.length < 4) return;
  const top = list.slice(0, 24);
  await pics(top.map(x => x.title));
  if(!alive(ctx)) return;
  const withPic = top.filter(x => picOf(x.title)).slice(0, 18);
  if(withPic.length >= 4) show(sec, strip(withPic));
}
async function moreBy(ctx, who, not){
  if(!who) return;
  const {list} = await bestKnown(`haswbstatement:P175=${who} haswbstatement:${ALBUMS}`, 60).catch(() => ({list: []}));
  const top = list.filter(x => x.title && x.title !== not).slice(0, 16);
  if(top.length < 2) return;
  await pics(top.map(x => x.title));
  if(!alive(ctx)) return;
  const xs = top.map(x => ({...x, year: yearIn(picCache[x.title]?.desc)})).sort((a, b) => (a.year || 9999) - (b.year || 9999));
  show("s-more", strip(xs, x => x.year ? String(x.year) : ""));
}

/* ---------- listening ---------- */
const SERVICES = [[/bandcamp\.com/, "Bandcamp"], [/open\.spotify\.com/, "Spotify"], [/music\.apple\.com|itunes\.apple\.com/, "Apple Music"], [/tidal\.com/, "Tidal"],
  [/deezer\.com/, "Deezer"], [/music\.youtube\.com/, "YouTube Music"], [/soundcloud\.com/, "SoundCloud"], [/qobuz\.com/, "Qobuz"], [/music\.amazon\./, "Amazon Music"]];
/* links MusicBrainz lists that are still current, one per service */
const serviceLinks = rels => {
  const out = new Map();
  for(const r of rels || []){
    const u = r.url?.resource; if(!u || r.ended || r["target-type"] !== "url") continue;
    const s = SERVICES.find(([re]) => re.test(u));
    if(s && !out.has(s[1])) out.set(s[1], u.replace(/^http:/, "https:"));
  }
  return out;
};
const searches = (q, have) => [["Bandcamp", "https://bandcamp.com/search?q="], ["Spotify", "https://open.spotify.com/search/"], ["Apple Music", "https://music.apple.com/us/search?term="],
  ["YouTube Music", "https://music.youtube.com/search?q="]].filter(([n]) => !have.has(n)).map(([n, u]) => [n, u + encodeURIComponent(q)]);

function recordListen(ctx, release, artist){
  const rels = [...(release?.relations || []), ...(release?.["release-group"]?.relations || [])];
  const have = serviceLinks(rels);
  const q = [artist?.name, ctx.short].filter(Boolean).join(" ");
  const html = linkRow("Listen on", [...have.entries()]) + linkRow(have.size ? "Search" : "Look for it on", searches(q, have))
    + linkRow("Look up", [release ? ["MusicBrainz", `https://musicbrainz.org/release-group/${release["release-group"]?.id || ""}`] : null,
      ["Discogs", "https://www.discogs.com/search/?type=all&q=" + encodeURIComponent(q)]].filter(Boolean));
  show("s-listen", html);
}

/* a few shows from the Live Music Archive, each playing on the page */
async function liveRoom(ctx, name, sec){
  const {count, shows} = await liveShows(name, 8).catch(() => ({count: 0, shows: []}));
  if(!alive(ctx) || !count || !shows.length) return;
  const host = $(sec); host.hidden = false;
  const box = document.createElement("div"); box.className = "mt-live";
  box.innerHTML = `<h3 class="minor">Live Music Archive · ${count.toLocaleString()} ${count === 1 ? "recording" : "recordings"}, free to play</h3>
    <ol class="mt-shows">${shows.map((s, i) => `<li><button type="button" class="mt-show" data-show="${i}"><span class="mt-sh-date">${esc(s.date || "")}</span>
      <span class="mt-sh-where">${esc([s.venue, s.place].filter(Boolean).join(", ") || s.title)}</span><span class="mt-sh-go" aria-hidden="true">▶</span></button></li>`).join("")}</ol>
    <div class="mt-showbox" hidden></div>
    <p class="chart-note"><a href="https://archive.org/search?query=${encodeURIComponent(lmaQ(name))}" ${ext}>All ${count.toLocaleString()} on the Internet Archive</a></p>`;
  host.querySelector(".body").append(box);
  box.onclick = async ev => {
    const b = ev.target.closest("[data-show]"); if(!b) return;
    const s = shows[+b.dataset.show], sb = box.querySelector(".mt-showbox");
    box.querySelectorAll("[data-show]").forEach(x => x.setAttribute("aria-pressed", x === b));
    sb.hidden = false; sb.innerHTML = `<p class="status">Opening the show…</p>`;
    const tracks = await showTracks(s.id).catch(() => []);
    if(!tracks.length){ sb.innerHTML = `<p class="status">The Archive has no tracks to play for this one — <a href="https://archive.org/details/${encodeURIComponent(s.id)}" ${ext}>see it there</a>.</p>`; return; }
    sb.innerHTML = `<p class="mt-sh-head"><b>${esc(s.date)}</b> ${esc([s.venue, s.place].filter(Boolean).join(", "))} · <a href="https://archive.org/details/${encodeURIComponent(s.id)}" ${ext}>On the Archive</a></p><div></div>`;
    trackList(sb.lastElementChild, tracks).playAll();
  };
}

/* ---------- an artist ---------- */
async function artistPage(ctx){
  const {e, id, name} = ctx;
  const band = !isHuman(e);
  $("views").innerHTML = section("s-disco", "Discography", "Every release on MusicBrainz, in order")
    + section("s-years", "Releases per year", "Point at a bar to see which")
    + section("s-line", "Before & after", "Who they learned from, and who learned from them")
    + section("s-web", band ? "Members & collaborators" : "Bandmates & collaborators", "The people they played and recorded with most")
    + section("s-similar", "Similar artists", "Listened to by the same people — from ListenBrainz")
    + section("s-film", "Film scores", CINEMA ? `Films they scored — open any in ${esc(CINEMA.name)}` : "")
    + section("s-listen", "Listen")
    + section("s-also", "Also then", "");

  const won = awards(e), genres = claimIds(e, "P136"), labels = claimIds(e, "P264"), members = claimIds(e, "P527"), memberOf = claimIds(e, "P463");
  const origin = [...claimIds(e, "P740"), ...claimIds(e, "P19")].slice(0, 1);
  const infoP = wdInfo([...genres.slice(0, 5), ...labels.slice(0, 4), ...members.slice(0, 8), ...memberOf.slice(0, 6), ...origin, ...won.slice(0, 30).map(a => a.id)]);
  infoP.then(info => {
    if(!alive(ctx)) return;
    addHonors(honors(won, info));
    const begin = band ? claimTime(e, "P571") : claimTime(e, "P569"), end = band ? claimTime(e, "P576") : claimTime(e, "P570");
    setFacts([[band ? "Formed" : "Born", esc([begin, info[origin[0]]?.name].filter(Boolean).join(", "))], [band ? "Split" : "Died", esc(end)],
      ["Genre", links(genres, info, 4)], ["Label", links(labels, info, 3)], ["Members", links(members, info, 6)], ["Member of", links(memberOf, info, 4)]]);
  }).catch(() => {});

  /* MusicBrainz: the artist (bandmates, links) and their releases */
  let mbid = claimStr(e, "P434");
  if(!mbid){
    const j = await mb("artist/", {query: `artist:${lucene(ctx.short)}`, limit: 3}).catch(() => null);
    mbid = j?.artists?.find(a => a.score >= 95 && norm(a.name) === norm(ctx.short))?.id || "";
  }
  if(!alive(ctx)) return;
  artistLineage(ctx);
  filmScores(ctx);
  liveRoom(ctx, ctx.short, "s-listen");
  if(!mbid){ show("s-listen", linkRow("Look for them on", searches(ctx.short, new Map()))); alsoArtist(ctx, null); return; }
  const disco = discography(ctx, mbid);
  const me = mb("artist/" + mbid, {inc: "artist-rels+url-rels"}).catch(() => null);
  me.then(a => {
    if(!alive(ctx)) return;
    const have = serviceLinks(a?.relations);
    const home = (a?.relations || []).find(r => r.type === "official homepage" && !r.ended)?.url?.resource;
    const body = $("s-listen").querySelector(".body");
    body.insertAdjacentHTML("afterbegin", linkRow("Listen on", [...have.entries()]) + linkRow(have.size ? "Search" : "Look for them on", searches(ctx.short, have))
      + linkRow("Look up", [home ? ["Official site", home] : null, ["MusicBrainz", "https://musicbrainz.org/artist/" + mbid]].filter(Boolean)));
    $("s-listen").hidden = false;
  });
  collaborators(ctx, mbid, me, disco);
  similar(ctx, mbid);
  disco.then(list => alsoArtist(ctx, list));
}

/* a page with no picture of its own (or whose picture didn't load) takes the covers of its best-known records */
function plateMosaic(covers, ctx){
  if(!$("plate").hidden || covers.length < 4) return false;
  $("plate").hidden = false; $("plate").className = "plate mt-mosaic";
  $("plate").innerHTML = covers.slice(0, 4).map(x => `<a href="${esc(here(x.title))}" title="${esc(x.name)}"><img src="${esc(picOf(x.title))}" alt=""></a>`).join("");
  if(ctx) Myriad.discover?.trail.add({wing: "metronome", title: ctx.name, name: ctx.short, img: picOf(covers[0].title)});
  return true;
}

/* the discography: albums, EPs, singles and live records, best-known first when there are many */
const TABS = [["album", "Albums"], ["ep", "EPs"], ["single", "Singles"], ["live", "Live"], ["comp", "Compilations"]];
async function discography(ctx, mbid){
  const get = async (types, pages) => {
    const out = [];
    for(let p = 0; p < pages; p++){
      const j = await mb("release-group/", {query: `arid:${mbid} AND primarytype:(${types}) AND status:official`, limit: 100, offset: p * 100}).catch(() => null);
      out.push(...(j?.["release-groups"] || []));
      if(!j || out.length >= j.count) break;
    }
    return out;
  };
  const groups = [...await get("album OR ep", 3), ...await get("single", 1)];
  const tab = g => { const s = g["secondary-types"] || [];
    if(s.some(x => /Remix|DJ-mix|Mixtape|Interview|Audiobook|Audio drama|Spokenword|Demo|Field recording/.test(x))) return "";
    return s.includes("Live") ? "live" : s.includes("Compilation") ? "comp" : g["primary-type"] === "EP" ? "ep" : g["primary-type"] === "Single" ? "single" : "album"; };
  const seen = new Set();
  let list = groups.filter(g => !seen.has(g.id) && seen.add(g.id)).map(g => ({rg: g.id, name: g.title, year: yearIn(g["first-release-date"]), n: g.count || 0, tab: tab(g)}))
    .filter(x => x.tab);
  if(!alive(ctx)) return list;
  /* Wikipedia's covers and fame for the records it knows: the artist's records on Wikidata, matched by name,
     then the best-known of the rest by their MusicBrainz ids */
  const theirs = (await bestKnown(`haswbstatement:P175=${ctx.id} haswbstatement:${ALBUMS}|P31=Q134556|P31=Q222910`, 300).catch(() => ({list: []}))).list.filter(x => x.title);
  const byName = new Map(); for(const x of theirs){ for(const k of [norm(x.name), norm(bare(x.title))]) if(!byName.has(k)) byName.set(k, x); }
  list = list.map(x => { const m = byName.get(norm(x.name)); return m ? {...x, title: m.title, pop: m.pop} : x; });
  const rest = list.filter(x => !x.title && x.tab !== "single").sort((a, b) => b.n - a.n).slice(0, 20);
  const known = await fromMB("P436", rest.map(x => ({mbid: x.rg, name: x.name}))).catch(() => ({}));
  list = list.map(x => !x.title && known[x.rg] ? {...x, title: known[x.rg].title, pop: known[x.rg].pop} : x);
  await pics(list.map(x => x.title));
  if(!alive(ctx)) return list;
  const counts = TABS.map(([k, l]) => [k, l, list.filter(x => x.tab === k).length]).filter(([, , n]) => n);
  if(!counts.length) return list;
  const start = counts.find(([k]) => k === "album") ? "album" : counts[0][0];
  const fame = x => (x.pop || 0) * 3 + x.n;
  const tabs = counts.length > 1 ? `<div class="tabs" role="group" aria-label="Kind of release">${counts.map(([k, l, n]) => `<button type="button" data-tab="${k}" aria-pressed="${k === start}">${l} <span>${n}</span></button>`).join("")}</div>` : "";
  const draw = k => {
    const items = list.filter(x => x.tab === k);
    /* a long list shows its best-known 40, in order; the rest on request */
    const ranked = items.slice().sort((a, b) => fame(b) - fame(a));
    const host = $("s-disco").querySelector(".body");
    host.innerHTML = tabs + `<div class="mt-disco"></div>`;
    host.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === k));
    capped(host.querySelector(".mt-disco"), ranked, l => wall(l.slice().sort((a, b) => (a.year || 9999) - (b.year || 9999))), {n: 40, what: TABS.find(([t]) => t === k)[1].toLowerCase()});
    show("s-years", perYear(items, TABS.find(([t]) => t === k)[1].toLowerCase()));
  };
  $("s-disco").onclick = ev => { const b = ev.target.closest("[data-tab]"); if(b) draw(b.dataset.tab); };
  $("s-disco").hidden = false;
  draw(start);
  /* their best-known covers beside the words, when the words run longer than the picture */
  const best = list.filter(x => x.tab === "album" && picOf(x.title)).sort((a, b) => fame(b) - fame(a)).slice(0, 16);
  if(plateMosaic(best, ctx)) best.splice(0, 4);
  Myriad.sideFill?.(best.slice(0, 12).map(x => ({src: picOf(x.title), name: x.name, title: [x.name, x.year].filter(Boolean).join(", "), href: here(x.title), internal: true})));
  return list;
}

/* bandmates from MusicBrainz, and the people Wikidata credits on their best-known records, drawn as a web */
async function collaborators(ctx, mbid, meP, discoP){
  const a = await meP, list = await discoP;
  if(!alive(ctx)) return;
  const people = new Map();
  const put = (key, p) => { const o = people.get(key); if(o){ o.n += p.n; p.why.forEach(w => o.why.add(w)); } else people.set(key, {...p, why: new Set(p.why)}); };
  const albums = (list || []).filter(x => x.tab === "album").length;
  for(const r of a?.relations || []){
    if(r["target-type"] !== "artist" || !r.artist?.id || r.artist.id === mbid) continue;
    const t = r.type, inst = (r.attributes || []).filter(x => !/original|founder|minor|additional/.test(x));
    const why = t === "member of band" ? (r.direction === "backward" ? (inst[0] || "member") : "played in the band")
      : t === "collaboration" ? "collaboration" : t === "subgroup" ? "offshoot band" : /supporting musician|vocal supporting|instrumental supporting/.test(t) ? "plays with them"
      : t === "teacher" ? (r.direction === "backward" ? "student" : "teacher") : t === "producer" ? "producer" : "";
    if(!why) continue;
    put(r.artist.id, {mbid: r.artist.id, name: r.artist.name, n: t === "member of band" ? Math.max(2, Math.round(albums / 2)) : 1, why: [why]});
  }
  const map = await fromMB("P434", [...people.values()]).catch(() => ({}));
  /* the people on their best-known records, counted by record */
  const top = (list || []).filter(x => x.title && x.tab !== "single").sort((a, b) => (b.pop || 0) - (a.pop || 0)).slice(0, 14);
  const recInfo = top.length ? await fromMBTitles(top) : {};
  const ents = await entities(Object.values(recInfo));
  const counts = {};
  for(const [qid, en] of Object.entries(ents)){
    const recName = en.labels?.en?.value || en.labels?.mul?.value || "";
    for(const [p, role] of [["P162", "producer"], ["P175", "performer"], ["P767", "player"], ["P86", "composer"]])
      for(const who of claimIds(en, p)){ if(who === ctx.id) continue; (counts[who] ||= {roles: new Set(), recs: new Set()}).roles.add(role); counts[who].recs.add(recName); }
  }
  const wdIds = Object.keys(counts).filter(i => counts[i].recs.size >= 2 || Object.values(map).some(m => m.id === i));
  const info = await wdInfo(wdIds);
  const nodes = new Map();
  for(const p of people.values()){
    const m = map[p.mbid], c = m && counts[m.id];
    nodes.set(m?.id || p.mbid, {id: m?.id, mbid: p.mbid, name: p.name, title: m?.title || "", n: Math.max(p.n, c?.recs.size || 0), note: [...p.why].join(", "),
      films: c ? [...c.recs].join("|") : ""});
  }
  for(const i of wdIds){
    if(nodes.has(i) || !info[i]?.name) continue;
    nodes.set(i, {id: i, name: info[i].name, title: info[i].title, n: counts[i].recs.size, note: [...counts[i].roles].join(", "), films: [...counts[i].recs].join("|")});
  }
  let ps = [...nodes.values()].sort((a, b) => b.n - a.n).slice(0, 14);
  if(ps.length < 2) return;
  await pics(ps.map(p => p.title));
  if(!alive(ctx)) return;
  ps = ps.map(p => ({...p, ct: p.films ? `${p.films.split("|").length} ${p.films.split("|").length === 1 ? "record" : "records"}` : p.note}));
  const center = {name: ctx.short, img: picOf(ctx.name) || ctx.img};
  show("s-web", `<div class="collab">${web(center, ps)}
    <ol class="ranked">${ps.map(p => `<li><a href="${esc(faceHref(p))}"${p.title ? "" : ` ${ext}`}>${esc(p.name)}</a><span class="role">${esc(p.note)}</span><span class="n">${p.films ? p.films.split("|").length : ""}</span></li>`).join("")}</ol></div>`);
}
/* records with English articles → their Wikidata items, in one request */
async function fromMBTitles(list){
  const j = await getJSON(W + "action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=" + encodeURIComponent(list.map(x => x.title).join("|"))).catch(() => null);
  const out = {};
  for(const p of Object.values(j?.query?.pages || {})) if(p.pageprops?.wikibase_item) out[p.title] = p.pageprops.wikibase_item;
  return out;
}

/* similar artists, from ListenBrainz: the ones Wikipedia knows, with a picture, first */
async function similar(ctx, mbid){
  const j = await getJSON("https://labs.api.listenbrainz.org/similar-artists/json?artist_mbids=" + mbid
    + "&algorithm=session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30", 15000).catch(() => null);
  const rows = (Array.isArray(j) ? j : []).filter(x => x.artist_mbid && x.artist_mbid !== mbid).slice(0, 20);
  if(!rows.length) return;
  const map = await fromMB("P434", rows.map(x => ({mbid: x.artist_mbid, name: x.name}))).catch(() => ({}));
  const list = rows.map(x => ({mbid: x.artist_mbid, name: x.name, ...(map[x.artist_mbid] ? {id: map[x.artist_mbid].id, title: map[x.artist_mbid].title} : {})}));
  await pics(list.map(x => x.title));
  if(!alive(ctx)) return;
  const pictured = list.filter(x => picOf(x.title)), rest = list.filter(x => !picOf(x.title) && x.title);
  const shown = [...pictured, ...rest].slice(0, 14);
  if(shown.length >= 3) show("s-similar", faces(shown));
}

/* influences, either way: Wikidata's "influenced by", read both directions */
async function artistLineage(ctx){
  const {e, id} = ctx;
  const before = claimIds(e, "P737"), after = (await wdFind("haswbstatement:P737=" + id + " -haswbstatement:" + ALBUMS, 30).catch(() => ({ids: []}))).ids;
  const info = await wdInfo([...before, ...after]);
  const pick = (ids, how) => ids.map(i => info[i]).filter(x => x?.name && x.title).sort((a, b) => b.pop - a.pop).slice(0, 8).map(x => ({...x, how}));
  const from = pick(before, "influence"), to = pick(after, "influenced");
  if(!from.length && !to.length) return;
  await pics([ctx.name, ...[...from, ...to].map(x => x.title)]);
  if(!alive(ctx)) return;
  const f = from.filter(x => picOf(x.title)), t = to.filter(x => picOf(x.title));
  const useF = f.length ? f : from, useT = t.length ? t : to;
  show("s-line", beforeAfter(useF, face({name: ctx.short, title: ctx.name, img: picOf(ctx.name) || ctx.img}), useT, face));
}

/* film composers: the films they scored, each opening in Cinema */
async function filmScores(ctx){
  if(!CINEMA) return;
  const {list, total} = await bestKnown("haswbstatement:P86=" + ctx.id + " haswbstatement:P31=Q11424", 80).catch(() => ({list: [], total: 0}));
  const films = list.filter(x => x.title).slice(0, 18);
  if(films.length < 2) return;
  await pics(films.map(x => x.title));
  if(!alive(ctx)) return;
  const html = films.filter(x => picOf(x.title)).map(x => `<a class="poster" href="${esc(topicIn(CINEMA, x.title))}"><div class="frame"><img src="${esc(picOf(x.title))}" alt="" loading="lazy" data-t="${esc(x.name)}"></div>
    <div class="cap"><span class="t">${esc(x.name)}</span>${yearIn(picCache[x.title]?.desc) ? `<span class="y">${yearIn(picCache[x.title].desc)}</span>` : ""}</div></a>`).join("");
  if(!html) return;
  show("s-film", `<div class="wall strip">${html}</div>${total > films.length ? `<p class="chart-note">The best known of ${total} films</p>` : ""}`);
  addReadon(`<a class="in-cinema" href="${esc(topicIn(CINEMA, ctx.name))}" style="--c:var(--c-cinema)">${esc(CINEMA.name)}</a>`);
}

/* "Also in": the year of their first record — the other records that came out that year */
async function alsoArtist(ctx, list){
  const dated = (list || []).filter(x => x.tab === "album" && x.year).sort((a, b) => a.year - b.year);
  const first = dated[0]?.year || claimYear(ctx.e, "P571") || claimYear(ctx.e, "P2031");
  if(!first) return;
  $("s-also").querySelector("h2").textContent = `Also in ${first}`;
  $("s-also").querySelector(".body").insertAdjacentHTML("beforebegin", `<p class="sub">${dated[0] ? `The year of ${esc(dated[0].name)}, their first album — what else came out` : "The year they began — the best-known records"}</p>`);
  alsoIn(ctx, first, "s-also", dated[0]?.title ? [dated[0].title] : []);
}

/* ---------- a genre, a scene or a label: its records, its artists, where it came from and went ---------- */
async function collectionPage(ctx){
  const {e, id, name, kind} = ctx;
  const label = kind === "label";
  $("views").innerHTML = section("s-recs", label ? "On the label" : "Defining records", "The best-known records, in order")
    + section("s-years", "Over the years", "Records a year among the best known — point at a bar to see which")
    + section("s-artists", label ? "Its artists" : "Artists", "The best known")
    + section("s-line", "Before & after", label ? "Where it came from, and what came of it" : "What it grew out of, and what grew out of it")
    + section("s-rel", "Related", "")
    + section("s-also", "Also then", "");
  const prop = label ? "P264" : "P136";
  let recs = (await bestKnown(`haswbstatement:${prop}=${id} haswbstatement:${ALBUMS}`, 150).catch(() => ({list: []}))).list.filter(x => x.title);
  /* a scene Wikidata seldom tags records with: the records of the artists it tags instead */
  const artists = (await bestKnown(`haswbstatement:${prop}=${id} haswbstatement:P31=Q5|P31=Q215380|P31=Q5741069|P31=Q2088357|P31=Q9212979`, 50).catch(() => ({list: []}))).list.filter(x => x.title);
  if(recs.length < 8 && artists.length){
    const more = await bestKnown(`haswbstatement:P175=${artists.slice(0, 12).map(a => a.id).join("|P175=")} haswbstatement:${ALBUMS}`, 100).catch(() => ({list: []}));
    const have = new Set(recs.map(x => x.id));
    recs = [...recs, ...more.list.filter(x => x.title && !have.has(x.id))].sort((a, b) => b.pop - a.pop);
  }
  if(!alive(ctx)) return;
  await pics([...recs.slice(0, 120).map(x => x.title), ...artists.slice(0, 30).map(x => x.title)]);
  if(!alive(ctx)) return;
  recs = recs.map(x => ({...x, year: yearIn(picCache[x.title]?.desc), by: (/ by (.+)$/.exec(picCache[x.title]?.desc || "") || [])[1] || ""}));
  if(recs.length){
    $("s-recs").hidden = false;
    capped($("s-recs").querySelector(".body"), recs, l => wall(l.slice().sort((a, b) => (a.year || 9999) - (b.year || 9999))), {n: 40, what: "records"});
    show("s-years", perYear(recs.slice(0, 120)));
    const covers = recs.filter(x => picOf(x.title));
    const took = plateMosaic(covers, ctx) ? 4 : 0;
    Myriad.sideFill?.(covers.slice(took, took + 12).map(x => ({src: picOf(x.title), name: x.name, title: x.name, href: here(x.title), internal: true})));
  }
  const pictured = artists.filter(x => picOf(x.title));
  if(pictured.length >= 3) show("s-artists", faces(pictured.slice(0, 16)));
  genreLineage(ctx, label).catch(() => {});
  /* "Also in": the year it began, or else the year of its best-known record */
  const y = claimYear(e, "P571") || recs.slice(0, 10).map(x => x.year).filter(Boolean).sort((a, b) => a - b)[0];
  if(y){
    $("s-also").querySelector("h2").textContent = `Also in ${y}`;
    $("s-also").querySelector(".body").insertAdjacentHTML("beforebegin", `<p class="sub">${claimYear(e, "P571") ? (label ? "The year it was founded" : "The year it began") + " — the best-known records" : "The best-known records of the year its story starts"}</p>`);
    alsoIn(ctx, y, "s-also", recs.map(x => x.title));
  }
}

/* where a genre came from and went: influences and what follows, then what it's a kind of and its offshoots.
   For a label: who founded it, and its imprints. */
async function genreLineage(ctx, label){
  const {e, id} = ctx;
  let fromIds, toIds, parent, kids;
  if(label){
    fromIds = [...claimIds(e, "P112"), ...claimIds(e, "P749")]; toIds = claimIds(e, "P355");
    parent = claimIds(e, "P749"); kids = toIds;
  } else {
    const after = await wdFind(`haswbstatement:P737=${id}|P155=${id} haswbstatement:P31=Q188451`, 30).catch(() => ({ids: []}));
    const offs = await wdFind(`haswbstatement:P279=${id}`, 40).catch(() => ({ids: []}));
    fromIds = [...claimIds(e, "P737"), ...claimIds(e, "P155"), ...claimIds(e, "P941")]; toIds = [...claimIds(e, "P156"), ...after.ids];
    parent = claimIds(e, "P279"); kids = offs.ids;
  }
  const info = await wdInfo([...fromIds, ...toIds, ...parent, ...kids]);
  const pick = (ids, how) => [...new Set(ids)].map(i => info[i]).filter(x => x?.name && x.title && x.id !== id).sort((a, b) => b.pop - a.pop).map(x => ({...x, how}));
  let from = pick(fromIds, label ? "founder" : "grew out of"), to = pick(toIds, label ? "imprint" : "came after");
  /* with nothing said either way, what it's a kind of and its offshoots stand in */
  if(!from.length) from = pick(parent, label ? "part of" : "a kind of");
  if(!to.length) to = pick(kids, label ? "imprint" : "offshoot");
  from = from.slice(0, 8); to = to.slice(0, 8);
  const shown = new Set([...from, ...to].map(x => x.id));
  const rel = [[label ? "Part of" : "A kind of", pick(parent, "")], ["Offshoots", pick(kids, "")]].map(([t, l]) => [t, l.filter(x => !shown.has(x.id)).slice(0, 14)]).filter(([, l]) => l.length);
  await pics([ctx.name, ...[...from, ...to].map(x => x.title)]);
  if(!alive(ctx)) return;
  const card = x => { const src = picOf(x.title); return src ? `<a class="poster mt-gcard" href="${esc(here(x.title))}"><div class="frame"><img src="${esc(src)}" alt="" loading="lazy" data-t="${esc(x.name)}"></div><div class="cap"><span class="t">${esc(cap(x.name))}</span></div></a>`
    : `<a class="mt-gword" href="${esc(here(x.title))}">${esc(cap(x.name))}</a>`; };
  if(from.length || to.length){
    const meSrc = $("plate").hidden ? "" : ($("plate").querySelector("img")?.src || "");
    const me = `<span class="poster mt-gcard mt-me"><div class="frame">${meSrc ? `<img src="${esc(meSrc)}" alt="">` : cloth(ctx.short)}</div><div class="cap"><span class="t">${esc(ctx.short)}</span></div></span>`;
    show("s-line", beforeAfter(from, me, to, card));
  }
  if(rel.length) show("s-rel", rel.map(([t, l]) => `<p class="rel-row"><b>${esc(t)}</b>${l.map(x => `<a class="tag-link" href="${esc(here(x.title))}">${esc(cap(x.name))}</a>`).join("")}</p>`).join(""));
}

/* ---------- a record known only to MusicBrainz (?rg=…) ---------- */
async function rgPage(rgid){
  const my = ++token;
  document.body.classList.add("on"); window.scrollTo(0, 0); shell();
  const g = await mb("release-group/" + rgid, {inc: "artist-credits+url-rels"}).catch(() => null);
  if(my !== token) return;
  if(!g){ $("lead").innerHTML = `<p class="status">Couldn't reach MusicBrainz just now. Try again in a moment.</p>`; return; }
  /* one page per record: if Wikipedia has it after all, go there */
  const wdq = (g.relations || []).find(r => r.type === "wikidata")?.url?.resource?.replace(/^.*\//, "");
  if(wdq){
    const info = await wdInfo([wdq]).catch(() => ({}));
    if(my !== token) return;
    if(info[wdq]?.title){ history.replaceState({title: info[wdq].title}, "", here(info[wdq].title)); return openTopic(info[wdq].title); }
  }
  const by = credit(g["artist-credit"]), year = yearIn(g["first-release-date"]);
  document.title = g.title + " — Metronome — Myriad";
  $("q").value = g.title;
  $("lead").innerHTML = `<h1>${esc(g.title)}</h1><p class="desc">${esc([year, (g["primary-type"] || "record").toLowerCase(), by ? "by " + by : ""].filter(Boolean).join(" "))}</p>
    <p class="readon"><b>Read more</b><span id="readon"><a href="https://musicbrainz.org/release-group/${esc(rgid)}" ${ext}>MusicBrainz</a></span></p>`;
  setPic(caa(rgid, 500), "is-cover");
  const ctx = {my, id: "", name: g.title, short: g.title, e: {}, kind: "record", caaPlate: true};
  Myriad.discover?.trail.add({wing: "metronome", title: g.title, name: g.title, img: caa(rgid, 250)});
  $("views").innerHTML = section("s-tracks", "Tracklist") + section("s-credits", "Credits", "The people on the record")
    + section("s-line", "Before & after", "What it drew on, and what drew on it") + section("s-year", year ? `Also in ${year}` : "Also then", "The year's best-known records")
    + section("s-listen", "Listen");
  Myriad.shelves?.render($("mshelves"), {title: g.title, description: "album", short: g.title});
  const release = await bestRelease(rgid, g["first-release-date"]).catch(() => null);
  if(!alive(ctx)) return;
  ctx.facts = () => setFacts([["By", esc(by)], ["Released", esc(g["first-release-date"] || "")], ["Label", esc((release?.["label-info"] || []).map(l => l.label?.name).filter(Boolean).slice(0, 2).join(", "))],
    ["Length", ctx.minutes ? `${ctx.minutes} minutes` : ""]]);
  ctx.facts();
  if(release){ caaPlateFallback(release); tracklist(ctx, release); credits(ctx, release, {}); recordLineage(ctx, release, {infoP: Promise.resolve({})}); }
  if(year) alsoIn(ctx, year, "s-year");
  recordListen(ctx, release, {name: by});
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
function go(title, others = [], query = ""){
  history.pushState({title, others, query}, "", "?t=" + encodeURIComponent(title));
  openTopic(title, others, query);
}
function landing(){ token++; Myriad.shelves?.clear(); document.body.classList.remove("on"); $("q").value = ""; document.title = "Metronome — Myriad"; }
window.addEventListener("popstate", ev => {
  const p = new URLSearchParams(location.search);
  if(ev.state?.title) openTopic(ev.state.title, ev.state.others, ev.state.query);
  else if(p.get("t")) openTopic(p.get("t"));
  else if(p.get("rg")) rgPage(p.get("rg"));
  else landing();
});
$("f").addEventListener("submit", ev => { ev.preventDefault(); search($("q").value); });
$("q").addEventListener("search", () => { if(!$("q").value && document.body.classList.contains("on")){ history.pushState(null, "", location.pathname); landing(); } });
/* links to other Metronome topics open in place, without reloading the page */
document.addEventListener("click", ev => {
  const a = ev.target.closest("a[href^='./?t='], a[href^='./?rg=']"); if(!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
  ev.preventDefault();
  const p = new URL(a.getAttribute("href"), location.href).searchParams;
  if(p.get("t")) go(p.get("t"));
  else { history.pushState({}, "", "?rg=" + p.get("rg")); rgPage(p.get("rg")); }
});
/* a cover that fails to load becomes a cloth cover with the record's name; a portrait becomes initials */
document.addEventListener("error", ev => {
  const img = ev.target; if(img.tagName !== "IMG") return;
  if(/coverartarchive\.org/.test(img.src)) caaFailed.add(img.src);
  if(img.id === "pic"){
    if(img.dataset.small){ const s = img.dataset.small; img.dataset.small = ""; img.src = s; }
    else if(!img.onerror) $("plate").hidden = true;
  }
  else if(img.closest(".mt-tile")) img.closest(".mt-tile").remove();
  else if(img.closest(".frame")) img.outerHTML = cloth(img.dataset.t || "");
  else if(img.closest(".ph")) img.remove();
  else if(img.closest(".side-fill a")) img.closest("a").remove();
  else if(img.closest(".dc-img, .dt-img, .dn-img")) img.outerHTML = `<span class="dc-ini">·</span>`;
}, true);

/* shared with the front page (landing.js) */
window.Metro = {mb, getJSON, wdFind, wdInfo, entities, bestKnown, fromMB, pics, picOf, picCache, bigger, commons, caa, rec, strip, face, faces, here, bare, cap, yearIn, norm,
  claimIds, claimStr, data, ofYear, liveShows, showTracks, trackList, stop, audio: AUDIO, go, lucene, kindOf};

const p = new URLSearchParams(location.search);
if(p.get("t")) openTopic(p.get("t"));
else if(p.get("rg")) rgPage(p.get("rg"));
else if(p.get("q")) search(p.get("q"));
}
