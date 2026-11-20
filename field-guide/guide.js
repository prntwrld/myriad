/* Myriad — Field Guide. Topic pages for species, for groups (a family, a genus, "owls"), and for wild places.
   Wikipedia gives the words; Wikidata joins a Wikipedia article to its taxon; iNaturalist gives the photographs,
   the look-alikes, the tree of life, when it's seen and what's seen near you; GBIF gives the range map;
   Xeno-canto's recordings come by way of Wikimedia Commons, which hosts them under open licences
   (Xeno-canto's own API now needs a personal key, which a public page can't carry). */
{
const {esc} = window.Myriad, D = window.Myriad.discover;
const $ = id => document.getElementById(id);
const ext = `target="_blank" rel="noopener"`;
const W = "https://en.wikipedia.org/w/api.php?format=json&origin=*&";
const WD = "https://www.wikidata.org/w/api.php?format=json&origin=*&";
const NAT = "https://api.inaturalist.org/v1/";
/* the Pacific Northwest, as iNaturalist's places: Washington, Oregon and British Columbia */
const PNW = "46,10,7085";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const thisMonth = () => new Date().getMonth() + 1;
const GROUP = {Aves:"birds", Plantae:"plants", Fungi:"fungi", Mammalia:"mammals", Insecta:"insects", Reptilia:"reptiles", Amphibia:"amphibians",
  Actinopterygii:"fish", Mollusca:"molluscs", Arachnida:"spiders and their kin", Animalia:"animals", Chromista:"seaweeds and their kin", Protozoa:"slime moulds and their kin"};
let token = 0;

/* fetch JSON with a time limit, and up to two polite retries if a service says "too many requests" */
/* Wikimedia asks browser apps to name themselves in an Api-User-Agent header */
const getJSON = async (url, ms=20000, tries=3) => {
  const wm = /\.(wikipedia|wikimedia|wikidata)\.org\/w\/api\.php/.test(url);
  const r = await fetch(url, {signal: AbortSignal.timeout(ms), ...(wm ? {headers: {"Api-User-Agent": "Myriad/1.0 (https://prntwrld.github.io/myriad/)"}} : {})});
  if(r.status === 429 && tries > 1){ await new Promise(ok => setTimeout(ok, 1500 * (4 - tries) + Math.random() * 600)); return getJSON(url, ms, tries-1); }
  if(!r.ok) throw new Error(r.status);
  return r.json();
};
const nat = (path, params={}) => getJSON(NAT + path + (Object.keys(params).length ? "?" + new URLSearchParams(params) : ""));

/* ---------- taxa ---------- */
/* an iNaturalist photo URL at another size: square (75), small (240), medium (500), large (1024) */
const size = (u, s) => u ? u.replace(/\/(square|small|medium|large|thumb|original)\.(jpe?g|png|gif|webp)/i, `/${s}.$2`) : "";
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const wikiTitle = u => u ? decodeURIComponent(u.replace(/^.*\/wiki\//, "")).replace(/_/g, " ") : "";
const here = t => `./?t=${encodeURIComponent(t)}`;
/* an iNaturalist taxon as a card-sized node */
const node = t => ({id: t.id, key: t.id, kind: "species", shape: "round", name: cap(t.preferred_common_name || t.name), sci: t.name, rank: t.rank, rankLevel: t.rank_level,
  title: wikiTitle(t.wikipedia_url) || t.name, get href(){ return here(this.title); }, img: size(t.default_photo?.medium_url || t.default_photo?.url, "medium"),
  sub: t.preferred_common_name ? t.name : "", count: t.observations_count || 0, group: t.iconic_taxon_name || ""});
/* the scientific name is italic only at genus level and below */
const sciHtml = (n, level) => level <= 20 ? `<i>${esc(n)}</i>` : esc(n);

/* a card: the photograph, the name, the scientific name (or a note) */
const card = (t, note) => `<a class="poster fg" href="${esc(t.href)}"><div class="frame">${t.img
  ? `<img src="${esc(t.img)}" alt="" loading="lazy" data-t="${esc(t.name)}">` : `<span class="cover">${esc(t.name)}</span>`}</div>
  <div class="cap"><span class="t">${esc(t.name)}</span>${note ? `<span class="y">${esc(note)}</span>` : t.sub ? `<span class="y sci">${sciHtml(t.sub, t.rankLevel ?? 10)}</span>` : ""}</div></a>`;

/* the most-seen species, from iNaturalist's counts: [{node, count}] */
const counts = async params => (await nat("observations/species_counts", {quality_grade: "research", ...params})).results
  .filter(r => r.taxon?.default_photo && r.taxon.rank !== "hybrid").map(r => ({node: node(r.taxon), count: r.count}));

/* ---------- sound: Xeno-canto's recordings on Wikimedia Commons, then iNaturalist's own ---------- */
/* Can this recording be played? Ask for its first few bytes before showing it; a broken link is left out. */
const playCache = {};
const playable = src => playCache[src] ||= new Promise(ok => {
  const a = new Audio(); let done = false;
  const end = v => { if(done) return; done = true; a.removeAttribute("src"); try { a.load(); } catch(e){} ok(v); };
  a.preload = "metadata";
  a.onloadedmetadata = () => end(isFinite(a.duration) && a.duration > 0 ? a.duration : true);
  a.onerror = () => end(false);
  setTimeout(() => end(false), 12000);
  a.src = src;
});
const stripTags = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
/* recordings of any of these species (scientific names) on Commons, Xeno-canto's first: {name: [track]} */
async function commonsSounds(names){
  if(!names.length) return {};
  const q = `filemime:audio (${names.map(n => `"${n.replace(/"/g, "")}"`).join(" OR ")})`;
  const j = await getJSON("https://commons.wikimedia.org/w/api.php?format=json&origin=*&action=query&generator=search&gsrnamespace=6&gsrlimit=50"
    + "&prop=imageinfo&iiprop=url|mime|extmetadata&iiextmetadatafilter=Artist|LicenseShortName&gsrsearch=" + encodeURIComponent(q));
  const out = {};
  for(const p of Object.values(j.query?.pages || {})){
    const ii = p.imageinfo?.[0]; if(!ii?.url || !/^audio\/|ogg/.test(ii.mime || "")) continue;
    const t = p.title.replace(/^File:/, "");
    const name = names.find(n => t.toLowerCase().includes(n.toLowerCase())); if(!name) continue;
    const xc = /\bXC ?(\d{3,8})\b/.exec(t)?.[1] || "";
    (out[name] ||= []).push({src: ii.url.split("?")[0], xc, page: ii.descriptionurl, title: t,
      by: stripTags(ii.extmetadata?.Artist?.value).slice(0, 60), lic: ii.extmetadata?.LicenseShortName?.value || "", from: xc ? "Xeno-canto" : "Wikimedia Commons"});
  }
  /* Xeno-canto's first, then the rest; mp3 before ogg and wav (which some browsers can't play) */
  for(const k in out) out[k].sort((a, b) => (!!b.xc - !!a.xc) || (/\.mp3$/i.test(b.src) - /\.mp3$/i.test(a.src)));
  return out;
}
/* iNaturalist observers' recordings of a species, for when Commons has none */
async function natSounds(id){
  const j = await nat("observations", {taxon_id: id, sounds: "true", quality_grade: "research", per_page: 8, order_by: "votes"});
  return (j.results || []).flatMap(o => (o.sounds || []).filter(s => s.file_url).slice(0, 1).map(s => ({src: s.file_url, page: o.uri, title: "",
    by: (s.attribution || "").replace(/^\(c\)\s*/, "").replace(/,.*$/, ""), lic: (s.license_code || "").toUpperCase().replace(/^CC-/, "CC "),
    from: "iNaturalist", when: o.observed_on || "", where: o.place_guess || ""})));
}
/* keep the tracks that will play, in order, at most n */
/* (a recording of a second or two is a click, not a song: below minDur seconds it's left out when its length is known) */
async function verified(tracks, n, minDur=0){
  const ok = await Promise.all(tracks.slice(0, n * 2).map(t => playable(t.src)));
  return tracks.slice(0, n * 2).filter((t, i) => ok[i] && !(typeof ok[i] === "number" && ok[i] < minDur) && (t.dur = typeof ok[i] === "number" ? ok[i] : 0, true)).slice(0, n);
}

/* ---------- the player: one sound at a time across the page; a list can play straight through ---------- */
const AUDIO = new Audio(); AUDIO.preload = "none";
let current = null;   /* {list, i} */
const ICON_PLAY = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8z" fill="currentColor"/></svg>`;
const ICON_PAUSE = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3h2.6v10H4.5zM8.9 3h2.6v10H8.9z" fill="currentColor"/></svg>`;
const mmss = s => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "";
const credit = t => [t.by, t.lic].filter(Boolean).join(" · ");
function trackList(host, tracks, {chain=false, pics=false}={}){
  const list = {host, tracks, chain};
  host.innerHTML = `<ol class="fg-tracks${pics ? " pics" : ""}">${tracks.map((t, i) => `<li class="fg-track" data-i="${i}">
      <button type="button" class="fg-play" data-play="${i}" aria-label="Play ${esc(t.name || "recording")}">${ICON_PLAY}</button>
      ${pics ? `<a class="fg-tr-img" href="${esc(t.href)}">${t.img ? `<img src="${esc(t.img)}" alt="" loading="lazy">` : ""}</a>` : ""}
      <div class="fg-tr-text"><span class="fg-tr-name">${t.href && pics ? `<a href="${esc(t.href)}">${esc(t.name)}</a>` : esc(t.name)}</span>
        <span class="fg-tr-meta">${esc([t.note, credit(t)].filter(Boolean).join(" · "))}${t.page ? ` · <a href="${esc(t.xc ? "https://xeno-canto.org/" + t.xc : t.page)}" ${ext}>${esc(t.xc ? "XC" + t.xc : t.from)}</a>` : ""}</span>
        <span class="fg-tr-bar"><i></i></span></div>
      <span class="fg-tr-time">${mmss(t.dur)}</span></li>`).join("")}</ol>`;
  host.onclick = e => { const b = e.target.closest("[data-play]"); if(b) play(list, +b.dataset.play); };
  return {playAll: () => play(list, 0, true)};
}
function mark(){
  document.querySelectorAll(".fg-track.on").forEach(li => { li.classList.remove("on"); li.querySelector(".fg-play").innerHTML = ICON_PLAY; });
  if(!current) return;
  const li = current.list.host.querySelector(`.fg-track[data-i="${current.i}"]`); if(!li) return;
  li.classList.add("on"); li.querySelector(".fg-play").innerHTML = AUDIO.paused ? ICON_PLAY : ICON_PAUSE;
  li.querySelector(".fg-play").setAttribute("aria-label", (AUDIO.paused ? "Play " : "Pause ") + (current.list.tracks[current.i].name || "recording"));
}
function play(list, i, fresh=false){
  if(!fresh && current?.list === list && current.i === i){ AUDIO.paused ? AUDIO.play().catch(() => {}) : AUDIO.pause(); return; }
  const t = list.tracks[i]; if(!t) return;
  current = {list, i}; AUDIO.src = t.src; AUDIO.play().catch(() => {}); mark();
  document.dispatchEvent(new CustomEvent("fg-play", {detail: t}));
}
AUDIO.addEventListener("play", mark); AUDIO.addEventListener("pause", mark);
AUDIO.addEventListener("timeupdate", () => {
  if(!current) return;
  const bar = current.list.host.querySelector(`.fg-track[data-i="${current.i}"] .fg-tr-bar i`);
  if(bar && AUDIO.duration) bar.style.width = (AUDIO.currentTime / AUDIO.duration * 100) + "%";
});
AUDIO.addEventListener("ended", () => {
  if(!current) return;
  const {list, i} = current;
  const bar = list.host.querySelector(`.fg-track[data-i="${i}"] .fg-tr-bar i`); if(bar) bar.style.width = "0";
  if(list.chain && i + 1 < list.tracks.length) play(list, i + 1, true); else { current = null; mark(); }
});
/* a recording that stops loading partway is skipped (in a list that plays through) */
AUDIO.addEventListener("error", () => { if(current?.list.chain && current.i + 1 < current.list.tracks.length) play(current.list, current.i + 1, true); });
const stop = () => { AUDIO.pause(); current = null; mark(); };

/* ---------- Wikipedia & Wikidata ---------- */
async function wikiSearch(q, n=6){
  const j = await getJSON(W + "action=query&list=search&srnamespace=0&srlimit=" + n + "&srsearch=" + encodeURIComponent(q));
  return (j.query?.search || []).map(x => x.title);
}
const summary = t => getJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t.replace(/ /g, "_")));
const entity = async id => (await getJSON(WD + "action=wbgetentities&props=claims&ids=" + id)).entities?.[id] || {};
const claimStr = (e, p) => e.claims?.[p]?.find(c => c.rank !== "deprecated")?.mainsnak?.datavalue?.value;
const claimId = (e, p) => claimStr(e, p)?.id;

/* an article's sections as plain text: {heading: text} (headings of every level, each with only its own text) */
const sectionCache = {};
const sections = title => sectionCache[title] ||= getJSON(W + "action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&titles=" + encodeURIComponent(title))
  .then(j => {
    const text = Object.values(j.query?.pages || {})[0]?.extract || "", out = {};
    let head = "Intro";
    for(const line of text.split("\n")){
      const m = /^(=+)\s*(.*?)\s*=+$/.exec(line);
      if(m){ head = m[2]; continue; }
      if(line.trim()) (out[head] ||= []).push(line.trim());
    }
    return out;
  }).catch(() => ({}));
const MARKS = /^(description|identification|appearance|characteristics|morphology|physical (description|characteristics|appearance)|field (marks|identification)|description and identification|anatomy and morphology|features)$/i;
/* the paragraphs that say what it looks like: the article's Description section (or the like), trimmed */
async function fieldMarks(title, max=1100){
  const s = await sections(title);
  const key = Object.keys(s).find(k => MARKS.test(k)) || Object.keys(s).find(k => /^description|identification|appearance/i.test(k));
  if(!key) return [];
  const out = []; let n = 0;
  for(const p of s[key]){ if(p.length < 40) continue; if(n > 0 && n + p.length > max) break; out.push(p); n += p.length; if(n > max) break; }
  return out;
}
/* the first sentence or two of a passage */
const sentences = (text, n=2, max=320) => {
  /* a sentence ends at . ! or ? followed by a space and a capital, so "12.0 ft" and "(i.e. blue-green)" stay whole */
  const ss = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
  let out = ""; for(const s of ss.slice(0, n)){ if(out && out.length + s.length > max) break; out += (out ? " " : "") + s; }
  return out;
};
/* measurements stand out in the field marks */
const marksHtml = p => esc(p).replace(/(\d[\d.,]*(?:\s?[–-]\s?\d[\d.,]*)?\s?(?:cm|mm|m|in|inches|g|kg|lb|oz|ft|feet|metres|meters)\b(?:\s\([^)]*\))?)/g, "<b>$1</b>");

/* ---------- small pieces of page ---------- */
/* a section starts hidden, and shows only once something has filled it; an empty sub line stays out of sight */
const section = (id, label, sub="") => `<section class="section" id="${id}" hidden><h2 class="label">${esc(label)}</h2><p class="sub">${sub}</p><div class="body"></div></section>`;
const show = (id, html) => { const s = $(id); if(!s) return null; s.querySelector(".body").innerHTML = html; s.hidden = false; return s; };
const setFacts = rows => {
  rows = rows.filter(r => r[1]); if(!rows.length) return;
  $("factlist").innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join(""); $("facts").hidden = false;
};
const num = n => Number(n).toLocaleString("en-US");
/* the "show all" switch under a long wall: the best-known 40, the rest on request */
function capped(host, items, render, {n=40, what="species", tile=0}={}){
  let all = false;
  /* a wall of square tiles shows whole rows: about 40, rounded up to fill the last row */
  if(tile){ const cols = Math.max(1, Math.floor((host.clientWidth + 6) / (tile + 6))); n = cols * Math.ceil(n / cols); }
  const draw = () => {
    const list = all ? items : items.slice(0, n);
    host.innerHTML = render(list) + (items.length > n ? `<p class="wall-more fg-more"><button type="button" class="linkish" data-all>${all
      ? `Show only the best known` : `These are the ${n} most seen — show all ${items.length} ${what}`}</button></p>` : "");
  };
  host.onclick = e => { if(e.target.closest("[data-all]")){ all = !all; draw(); if(!all) host.scrollIntoView({block: "nearest"}); } };
  draw();
}

/* a wall of members under the header, leaving out any already pictured beside the summary (see Myriad.sideFill) */
let sideShown = new Set();
document.addEventListener("myriad-sidefill", e => { sideShown = new Set(e.detail); document.dispatchEvent(new Event("fg-redraw")); });
function membersWall(ctx, host, list){
  const draw = () => capped(host, list.filter(x => !sideShown.has(x.node.href)),
    l => `<div class="wall fg-wall">${l.map(x => card(x.node, `${num(x.count)} sightings`)).join("")}</div>`);
  const redraw = () => { if(alive(ctx)) draw(); else document.removeEventListener("fg-redraw", redraw); };
  document.addEventListener("fg-redraw", redraw);
  draw();
}

/* the IUCN Red List categories, and the regional ones worth noting */
const IUCN = {LC:"Least Concern", NT:"Near Threatened", VU:"Vulnerable", EN:"Endangered", CR:"Critically Endangered", EW:"Extinct in the Wild", EX:"Extinct", DD:"Data Deficient"};
const IUCN_QID = {Q211005:"LC", Q719675:"NT", Q278113:"VU", Q11394:"EN", Q219127:"CR", Q239509:"EW", Q237350:"EX", Q3245245:"DD"};
const PNW_PLACES = {46: "Washington", 10: "Oregon", 7085: "British Columbia"};
function status(t, e){
  const iucnS = (t?.conservation_statuses || []).find(c => /IUCN/i.test(c.authority || "") && !c.place);
  const code = (iucnS?.status || "").toUpperCase();
  const iucn = IUCN[code] ? code : IUCN_QID[claimId(e || {}, "P141")] || "";
  const regional = (t?.conservation_statuses || []).filter(c => c.place && PNW_PLACES[c.place.id] && (c.iucn >= 30 || /endangered|threatened|imperiled|special concern|vulnerable/i.test(c.status_name || "")))
    .map(c => `${cap(c.status_name || c.status)} in ${PNW_PLACES[c.place.id]}`);
  if(!iucn && !regional.length) return "";
  return `<div class="honors fg-status"><b>Status</b><p class="h-list">${iucn ? `<span class="iucn iucn-${iucn.toLowerCase()}">${IUCN[iucn]} <i>IUCN Red List</i></span>` : ""}${
    [...new Set(regional)].slice(0, 3).map(r => `<span>${esc(r)}</span>`).join("")}</p></div>`;
}

/* ---------- the page ---------- */
const TOPIC = $("ftopic");
function shell(){
  TOPIC.innerHTML = `<div class="hero">
      <article class="lead" id="lead"><p class="status">Looking it up…</p></article>
      <aside class="side"><figure class="plate" id="plate" hidden><img class="pic" id="pic" alt=""><figcaption class="fg-credit" id="credit"></figcaption></figure>
        <div class="facts" id="facts" hidden><h2 class="label">Quick facts</h2><dl id="factlist"></dl></div></aside></div>
    <div id="views"></div><div id="fshelves"></div>`;
}
const alive = ctx => ctx.my === token;
/* for a group or a place: one photo of each of the species seen most (in the Northwest where there are enough),
   each with its name on it, so it's plain they're different things; each opens that species' page */
async function offerMembers(ctx, where, local=true){
  let list = local ? await counts({...where, place_id: PNW, per_page: 16}).catch(() => []) : [];
  if(list.length < 4) list = await counts({...where, per_page: 16}).catch(() => []);
  if(!alive(ctx) || list.length < 2) return;
  Myriad.sideFill?.(list.map(x => ({src: x.node.img, href: x.node.href, internal: true, name: x.node.name,
    title: `${x.node.name}${x.node.sub ? ` (${x.node.sub})` : ""} — ${num(x.count)} sightings`})));
}
/* more pictures of the same species for the space under the main photo, when the words beside it run longer
   (see Myriad.sideFill): its best-liked recent sightings, in the Northwest where there are enough */
async function offerFill(ctx, where){
  const get = extra => nat("observations", {...where, ...extra, photos: "true", quality_grade: "research", order_by: "votes", per_page: 14})
    .then(j => (j.results || []).filter(o => o.photos?.[0]?.url)).catch(() => []);
  let obs = await get({place_id: PNW});
  if(obs.length < 4) obs = await get({});
  if(!alive(ctx) || obs.length < 2) return;
  Myriad.sideFill?.(obs.map(o => ({src: size(o.photos[0].url, "medium"), href: o.uri,
    title: [cap(o.taxon?.preferred_common_name || o.taxon?.name || ""), o.place_guess, (o.photos[0].attribution || "").replace(/^\(c\)\s*/, "© ").replace(/,.*$/, "")].filter(Boolean).join(" · ")})));
}

/* which iNaturalist taxon an article is about: Wikidata's iNaturalist ID, else its scientific name */
async function findTaxon(e, name){
  const id = claimStr(e, "P3151");
  if(id) try { const t = (await nat("taxa/" + id)).results?.[0]; if(t?.is_active !== false) return t; } catch(err){}
  const sci = claimStr(e, "P225") || "";
  /* no word from Wikidata (or no scientific name): ask iNaturalist for the article's own name, and keep a taxon
     only if iNaturalist links it to this same article, or knows it by exactly this name */
  if(!sci){
    if(e.claims) return null;
    const low = name.toLowerCase().replace(/ \(.*\)$/, "");
    const hits = (await nat("taxa/autocomplete", {q: low, per_page: 6, is_active: "true"})).results || [];
    const hit = hits.find(t => wikiTitle(t.wikipedia_url).toLowerCase() === name.toLowerCase())
      || hits.find(t => [t.name, t.preferred_common_name, t.matched_term].some(x => x?.toLowerCase() === low));
    return hit ? (await nat("taxa/" + hit.id)).results?.[0] || hit : null;
  }
  const hits = (await nat("taxa", {q: sci, is_active: "true", per_page: 5})).results || [];
  const hit = hits.find(t => t.name.toLowerCase() === sci.toLowerCase()) || null;
  return hit ? (await nat("taxa/" + hit.id)).results?.[0] || hit : null;
}

async function openTopic(title, others=[], query=""){
  const my = ++token; sideShown = new Set();
  document.body.classList.add("on"); window.scrollTo(0, 0); stop();
  $("q").value = query || title;
  shell();
  let s, pre = null;
  try { s = await summary(title); } catch(e){
    if(my !== token) return;
    /* not a Wikipedia title: perhaps a common or scientific name iNaturalist knows */
    if(!query && e.message === "404") return search(title, true);
    /* Wikipedia can't be reached: iNaturalist keeps the start of the article, so a species page can still be made */
    pre = await findTaxon({}, title).catch(() => null);
    if(my !== token) return;
    if(!pre){ $("lead").innerHTML = `<p class="status">Couldn't load that. Try again in a moment, or try another search.</p>`; return; }
    s = {title: title.toLowerCase() === pre.name.toLowerCase() && pre.preferred_common_name ? cap(pre.preferred_common_name) : title, extract: stripTags(pre.wikipedia_summary), description: "", content_urls: {desktop: {page: pre.wikipedia_url || "https://en.wikipedia.org/wiki/" + encodeURIComponent(title)}}};
  }
  if(my !== token) return;
  const name = s.title || title;
  document.title = name + " — Field Guide — Myriad";
  const disamb = s.type === "disambiguation";
  const otherLinks = others.filter(o => o !== title && o !== name).slice(0, 5);
  $("lead").innerHTML = `<h1>${esc(name)}</h1>
    ${s.description ? `<p class="desc">${esc(s.description)}</p>` : ""}
    <p class="extract">${esc(disamb ? "This name can mean several things. Try a more exact search." : s.extract)}</p>
    <p class="readon"><b>Read more</b><span id="readon"><a href="${esc(s.content_urls?.desktop?.page)}" ${ext}>Wikipedia</a></span></p>
    ${otherLinks.length ? `<p class="others">Did you mean: ${otherLinks.map(o => `<a href="${here(o)}">${esc(o)}</a>`).join(" · ")}</p>` : ""}`;
  const thumb = s.thumbnail?.source, orig = s.originalimage;
  const wikiImg = thumb && orig?.width > 720 && /\/\d+px-/.test(thumb) ? thumb.replace(/\/\d+px-/, "/720px-") : orig?.source || thumb;
  const plate = (src, creditHtml) => { if(!src || my !== token) return; $("pic").src = src; $("credit").innerHTML = creditHtml || ""; $("plate").hidden = false; };
  if(!disamb) Myriad.shelves?.render($("fshelves"), {title: name, description: s.description, short: name.replace(/ \(.*\)$/, "")});
  if(!pre && (!s.wikibase_item || disamb)){ plate(wikiImg); return; }
  let e = {}, t = pre;
  if(!pre) try { e = await entity(s.wikibase_item); } catch(err){}
  if(my !== token) return;
  if(!t) try { t = await findTaxon(e, name); } catch(err){}
  if(my !== token) return;
  const ctx = {my, name, e, t, qid: s.wikibase_item, desc: s.description || ""};
  if(t){
    /* the photo at the top is iNaturalist's chosen photograph for the taxon */
    const p = t.default_photo;
    if(p?.medium_url) plate(size(p.medium_url, "large"), `<a href="https://www.inaturalist.org/photos/${p.id}" ${ext}>${esc((p.attribution || "").replace(/^\(c\)\s*/, "© ").replace(/, uploaded by.*$/, ""))}</a>`);
    else plate(wikiImg);
    Myriad.discover?.trail.add({wing: "field-guide", title: name, name, img: size(p?.medium_url || "", "small") || thumb || ""});
    $("readon").insertAdjacentHTML("beforeend", `<a href="https://www.inaturalist.org/taxa/${t.id}" ${ext}>iNaturalist</a>`
      + `<a class="drift-here" href="./?drift=${t.id}&name=${encodeURIComponent(name)}">Drift from here</a>`);
    /* a species: more photos of itself; a group: one photo each of its most-seen members, named */
    if(t.rank_level <= 10) offerFill(ctx, {taxon_id: t.id}); else offerMembers(ctx, {taxon_id: t.id});
    return t.rank_level <= 10 ? speciesPage(ctx) : groupPage(ctx);
  }
  plate(wikiImg);
  Myriad.discover?.trail.add({wing: "field-guide", title: name, name, img: thumb || ""});
  const at = claimStr(e, "P625");
  if(at?.latitude != null){ offerMembers(ctx, {lat: at.latitude, lng: at.longitude, radius: 10}, false); return placePage({...ctx, lat: at.latitude, lng: at.longitude}); }
}

/* ---------- a species ---------- */
async function speciesPage(ctx){
  const {t, e, name} = ctx;
  const me = node(t), group = GROUP[t.iconic_taxon_name] || "species", month = thisMonth();
  $("views").innerHTML = section("s-photos", "Photographs", "From iNaturalist's observers")
    + section("s-song", "Songs & calls", "Recordings to play here — press one, or play them all")
    /* field marks and range & season share a row: the words on the left, the map and the months on the right */
    + `<div class="fg-pair">${section("s-marks", "Field marks", "What to look for")}${section("s-range", "Range & season", "")}</div>`
    + section("s-alike", "Look-alikes", "What it's most often mistaken for on iNaturalist, side by side")
    + section("s-near", "Seen near you", "Recent sightings around where you are")
    + section("s-tree", "Before & after", "Its place in the tree of life: the family above it, its closest relatives beside it")
    + section("s-also", `Also out in ${MONTHS[month - 1]}`, "");
  $("readon").closest(".readon").insertAdjacentHTML("beforebegin", status(t, e));

  const anc = t.ancestors || [];
  const rankOf = r => anc.find(a => a.rank === r);
  const fam = rankOf("family"), genus = rankOf("genus");
  const link = a => a ? `<a href="${esc(here(wikiTitle(a.wikipedia_url) || a.name))}">${esc(cap(a.preferred_common_name || a.name))}</a>${a.preferred_common_name ? ` <span class="fg-dim">(${esc(a.name)})</span>` : ""}` : "";
  const listed = (t.listed_taxa || []).filter(l => PNW_PLACES[l.place?.id] && l.establishment_means);
  const means = [...new Set(listed.map(l => l.establishment_means))];
  setFacts([["Scientific name", sciHtml(t.name, t.rank_level)], ["Family", link(fam)], ["Order", link(rankOf("order"))], ["Class", link(rankOf("class"))],
    ["In the Northwest", means.length === 1 ? esc(cap(means[0])) : esc(listed.map(l => `${cap(l.establishment_means)} in ${PNW_PLACES[l.place.id]}`).join(", "))],
    ["On iNaturalist", t.observations_count ? esc(num(t.observations_count) + " sightings") : ""]]);

  /* more photographs */
  const photos = (t.taxon_photos || []).map(x => x.photo).filter(p => p?.medium_url && p.id !== t.default_photo?.id).slice(0, 16);
  if(photos.length >= 2) show("s-photos", `<div class="stills fg-stills">${photos.map(p => `<a href="https://www.inaturalist.org/photos/${p.id}" ${ext} title="${esc((p.attribution || "").replace(/^\(c\)\s*/, "© "))}">
    <img src="${esc(p.medium_url)}" alt="${esc(name)}" loading="lazy"></a>`).join("")}</div>`);

  /* songs and calls */
  (async () => {
    let tracks = [];
    try { tracks = (await commonsSounds([t.name]))[t.name] || []; } catch(err){}
    if(tracks.length < 3) try { tracks = [...tracks, ...await natSounds(t.id)]; } catch(err){}
    if(!alive(ctx) || !tracks.length) return;
    const ok = await verified(tracks, 6, 3);
    if(!alive(ctx) || !ok.length) return;
    ok.forEach((x, i) => { x.name = x.xc ? `Recording XC${x.xc}` : x.when ? `Recorded ${x.when}` : `Recording ${i + 1}`; x.note = x.where || ""; });
    const ebird = claimStr(e, "P3444"), anyXC = ok.some(x => x.xc);
    const links = [anyXC && ["Xeno-canto", `https://xeno-canto.org/species/${t.name.split(" ").slice(0, 2).join("-")}`],
      ebird && ["Macaulay Library", `https://search.macaulaylibrary.org/catalog?taxonCode=${encodeURIComponent(ebird)}&mediaType=audio&sort=rating_rank_desc`]].filter(Boolean);
    const sec = show("s-song", `<div class="fg-song-ctl">${ok.length > 1 ? `<button type="button" class="ghost" id="fg-all">Play all ${ok.length}</button>` : ""}</div><div id="fg-tracks"></div>
      ${links.length ? `<p class="watch"><b>Listen to more</b>${links.map(([a, u]) => `<a href="${esc(u)}" ${ext}>${esc(a)}</a>`).join("")}</p>` : ""}`);
    const list = trackList($("fg-tracks"), ok, {chain: true});
    if($("fg-all")) $("fg-all").onclick = list.playAll;
    sec && (sec.querySelector(".sub").textContent = anyXC ? "Recordings from Xeno-canto, by way of Wikimedia Commons — press one, or play them all" : "Recordings from iNaturalist's observers — press one, or play them all");
  })();

  /* field marks, and the look-alikes beside it */
  const myMarks = fieldMarks(name);
  myMarks.then(ps => { if(alive(ctx) && ps.length) show("s-marks", `<div class="fg-marks">${ps.map(p => `<p>${marksHtml(p)}</p>`).join("")}</div>`); });
  nat("identifications/similar_species", {taxon_id: t.id, per_page: 8}).then(async j => {
    const alikes = (j.results || []).filter(r => r.taxon?.default_photo && r.taxon.rank_level <= 10).slice(0, 5).map(r => ({...node(r.taxon), n: r.count}));
    if(!alive(ctx) || !alikes.length) return;
    const mine = (await myMarks)[0] || "";
    show("s-alike", `<div class="fg-alike-pick" role="group" aria-label="Look-alikes">${alikes.map((a, i) => `<button type="button" data-alike="${i}" aria-pressed="${i === 0}">
        <span class="fg-ap-img"><img src="${esc(size(a.img, "small"))}" alt=""></span><span class="fg-ap-name">${esc(a.name)}</span></button>`).join("")}</div>
      <div class="fg-compare" id="fg-compare"></div>`);
    const side = (x, text, link) => `<figure class="fg-cmp"><a class="fg-cmp-img" href="${esc(x.href)}"><img src="${esc(size(x.img, "large"))}" alt="${esc(x.name)}" loading="lazy"></a>
      <figcaption><h3>${link ? `<a href="${esc(x.href)}">${esc(x.name)}</a>` : esc(x.name)}</h3><p class="fg-cmp-sci">${sciHtml(x.sci, x.rankLevel)}</p>
      ${text ? `<p class="fg-cmp-text">${marksHtml(sentences(text, 3, 420))}</p>` : ""}</figcaption></figure>`;
    const pick = async i => {
      const a = alikes[i];
      $("s-alike").querySelectorAll("[data-alike]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.alike === i));
      const draw = text => { if(alive(ctx)) $("fg-compare").innerHTML = side(me, mine, false)
        + `<div class="fg-vs"><span>or</span><small>mistaken for each other ${num(a.n)} ${a.n === 1 ? "time" : "times"}</small></div>` + side(a, text, true); };
      draw("");
      const marks = await fieldMarks(a.title).catch(() => []);
      if($("s-alike").querySelector(`[data-alike="${i}"][aria-pressed="true"]`)) draw(marks[0] || "");
    };
    $("s-alike").querySelector(".fg-alike-pick").onclick = ev => { const b = ev.target.closest("[data-alike]"); if(b) pick(+b.dataset.alike); };
    pick(0);
  }).catch(() => {});

  /* range and season: GBIF's map, and when it's seen */
  rangeAndSeason(ctx, {taxon_id: t.id}, claimStr(e, "P846"), t.name);

  /* seen near you */
  nearYou(ctx, t);

  /* the tree of life: the family above it, its closest relatives beside it */
  (async () => {
    let rel = [];
    try {
      if(genus) rel = (await nat("taxa", {parent_id: genus.id, rank: "species", is_active: "true", order_by: "observations_count", per_page: 9})).results
        .filter(x => x.id !== t.id && x.default_photo).map(x => ({...node(x), how: "same genus"}));
      if(rel.length < 4 && fam){
        const more = (await nat("taxa", {taxon_id: fam.id, rank: "species", is_active: "true", order_by: "observations_count", per_page: 14})).results
          .filter(x => x.id !== t.id && x.default_photo && !rel.some(r => r.id === x.id)).map(x => ({...node(x), how: "same family"}));
        rel = [...rel, ...more].slice(0, 8);
      }
    } catch(err){}
    if(!alive(ctx) || (!fam && !rel.length)) return;
    ctx.relatives = rel.map(r => r.id);
    const famNode = fam && node(fam);
    const chain = ["kingdom", "phylum", "class", "order"].map(rankOf).filter(Boolean);
    show("s-tree", `${chain.length ? `<p class="fg-chain">${chain.map(a => `<a href="${esc(here(wikiTitle(a.wikipedia_url) || a.name))}">${esc(cap(a.preferred_common_name || a.name))}</a>`).join(`<span aria-hidden="true">›</span>`)}</p>` : ""}
      <div class="before-after fg-tree">
      ${famNode ? `<div class="ba-col"><h3 class="minor">Family</h3><div class="ba-list"><div class="ba-item">${card({...famNode, sub: fam.name, rankLevel: fam.rank_level})}<span class="ba-how">its family</span></div></div></div>` : `<div class="ba-col"></div>`}
      <div class="ba-this"><span class="ba-arrow" aria-hidden="true">→</span>${card(me)}${rel.length ? `<span class="ba-arrow" aria-hidden="true">→</span>` : ""}</div>
      ${rel.length ? `<div class="ba-col"><h3 class="minor">Closest relatives</h3><div class="ba-list">${rel.map(r => `<div class="ba-item">${card(r)}<span class="ba-how">${esc(r.how)}</span></div>`).join("")}</div></div>` : `<div class="ba-col"></div>`}
      </div>`);
  })();

  /* also out this month: others of its kind seen in the Northwest now (or, for a species that isn't found here, anywhere) */
  (async () => {
    try {
      const h = await nat("observations/histogram", {taxon_id: t.id, place_id: PNW, date_field: "observed", interval: "year"});
      const local = Object.values(h.results?.year || {}).reduce((a, b) => a + b, 0) > 20;
      const got = await counts({month, iconic_taxa: t.iconic_taxon_name || "", ...(local ? {place_id: PNW} : {}), per_page: 30});
      await new Promise(ok => setTimeout(ok, 600));   /* let the relatives arrive first, so they aren't repeated here */
      const list = got.filter(x => x.node.id !== t.id && !(ctx.relatives || []).includes(x.node.id)).slice(0, 16);
      if(!alive(ctx) || list.length < 4) return;
      $("s-also").querySelector(".sub").textContent = `Other ${group} seen ${local ? "in the Pacific Northwest" : "around the world"} this month`;
      show("s-also", `<div class="wall strip fg-strip">${list.map(x => card(x.node)).join("")}</div>`);
    } catch(err){}
  })();
}

/* ---------- range & season (a species or a group) ---------- */
function rangeAndSeason(ctx, natFilter, gbifKey, sci){
  const sec = $("s-range"); if(!sec) return;
  sec.querySelector(".body").innerHTML = `<div class="fg-range"><div class="fg-map-wrap" id="fg-map-wrap" hidden><div class="fg-map" id="fg-map"></div>
    <p class="chart-note" id="fg-map-note"></p></div><div class="fg-season" id="fg-season" hidden></div></div>`;
  /* the bar of months: in the Northwest when it's seen here often enough to say, else everywhere */
  (async () => {
    const hist = async extra => Object.entries((await nat("observations/histogram", {...natFilter, ...extra, date_field: "observed", interval: "month_of_year", verifiable: "true"})).results?.month_of_year || {});
    let rows = await hist({place_id: PNW}).catch(() => []), where = "in the Pacific Northwest";
    if(rows.reduce((a, [, n]) => a + n, 0) < 30){ rows = await hist({}).catch(() => []); where = "worldwide"; }
    const total = rows.reduce((a, [, n]) => a + n, 0);
    if(!alive(ctx) || total < 12) return;
    const max = Math.max(...rows.map(([, n]) => n)), now = thisMonth();
    const peak = rows.filter(([, n]) => n >= max * .75).map(([m]) => +m);
    /* the peak as a run of months: "May–September" (wrapping round the year end) */
    const runs = []; for(const m of peak){ const r = runs.find(r => r[1] % 12 + 1 === m); r ? r[1] = m : runs.push([m, m]); }
    if(runs.length > 1 && runs[0][0] === 1 && runs.at(-1)[1] === 12){ runs[0][0] = runs.at(-1)[0]; runs.pop(); }
    const runText = runs.map(([a, b]) => a === b ? MONTHS[a - 1] : `${MONTHS[a - 1]}–${MONTHS[b - 1]}`).join(" and ");
    const nowN = (rows.find(([m]) => +m === now) || [0, 0])[1];
    $("fg-season").innerHTML = `<h3 class="minor">When to look</h3>
      <div class="fg-months" role="img" aria-label="${esc(`Sightings by month ${where}; most in ${runText}`)}">${rows.map(([m, n]) => `<div class="fg-mo${+m === now ? " now" : ""}" data-n="${n}" title="${MONTHS[m - 1]}: ${num(n)} sightings">
        <i style="height:${Math.max(3, n / max * 100)}%"></i><span>${MONTHS[m - 1][0]}</span></div>`).join("")}</div>
      <p class="chart-note">Most often seen ${where} in ${esc(runText)}${nowN ? ` · ${num(nowN)} sightings in ${MONTHS[now - 1]}s so far` : ""}</p>`;
    $("fg-season").hidden = false; sec.hidden = false;
    if(!sec.querySelector(".sub").textContent) sec.querySelector(".sub").textContent = "The months it's seen";
  })();
  /* GBIF's map: every record GBIF holds, as hexagons over OpenStreetMap */
  (async () => {
    if(!window.L) return;
    let key = gbifKey;
    if(!key && sci) try { const m = await getJSON("https://api.gbif.org/v1/species/match?name=" + encodeURIComponent(sci)); if(m.matchType !== "NONE" && m.usageKey) key = m.usageKey; } catch(err){}
    if(!key) return;
    const caps = await getJSON(`https://api.gbif.org/v2/map/occurrence/density/capabilities.json?taxonKey=${key}`).catch(() => null);
    if(!alive(ctx) || !caps?.total) return;
    $("fg-map-wrap").hidden = false; sec.hidden = false;
    sec.querySelector(".sub").textContent = "Where it lives, from GBIF's records, and the months it's seen";
    const map = L.map("fg-map", {scrollWheelZoom: false, worldCopyJump: true, attributionControl: true});
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 12, attribution: "© OpenStreetMap"}).addTo(map);
    L.tileLayer(`https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${key}&bin=hex&hexPerTile=48&style=green2.poly`,
      {maxZoom: 12, opacity: .85, attribution: `<a href="https://www.gbif.org/species/${key}" target="_blank" rel="noopener">GBIF</a>`}).addTo(map);
    const lat = [Math.max(-70, caps.minLat), Math.min(80, caps.maxLat)], lng = [caps.minLng, caps.maxLng];
    const fit = () => lng[1] - lng[0] > 300 ? map.setView([25, -100], 1) : map.fitBounds([[lat[0], lng[0]], [lat[1], lng[1]]], {padding: [16, 16], maxZoom: 7});
    fit();
    /* the map's box can change size after it's drawn (the field marks arriving beside it): redraw and refit, once things settle */
    let w = $("fg-map").clientWidth, moved = false;
    map.once("movestart zoomstart", () => moved = true);
    new ResizeObserver(() => { const nw = $("fg-map")?.clientWidth; if(!nw || nw === w) return; w = nw; map.invalidateSize(); if(!moved) fit(); }).observe($("fg-map"));
    $("fg-map-note").innerHTML = `${num(caps.total)} records on <a href="https://www.gbif.org/species/${key}" ${ext}>GBIF</a> — the darker the hexagon, the more`;
  })();
}

/* ---------- seen near you: only if the visitor lets the page know where they are ---------- */
const KM = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
async function nearYou(ctx, t){
  if(!navigator.geolocation) return;
  let state = "prompt";
  try { state = (await navigator.permissions.query({name: "geolocation"})).state; } catch(err){}
  if(!alive(ctx) || state === "denied") return;
  const run = () => navigator.geolocation.getCurrentPosition(async pos => {
    const {latitude: lat, longitude: lng} = pos.coords;
    for(const radius of [25, 100, 400]){
      const j = await nat("observations", {taxon_id: t.id, lat, lng, radius, photos: "true", verifiable: "true", order_by: "observed_on", order: "desc", per_page: 12}).catch(() => null);
      if(!alive(ctx)) return;
      const obs = (j?.results || []).filter(o => o.photos?.[0]?.url);
      if(obs.length >= 3 || (radius === 400 && obs.length)){
        $("s-near").querySelector(".sub").textContent = `The latest sightings within ${radius} km of you, from iNaturalist — your location stays in this browser`;
        show("s-near", `<div class="fg-near">${obs.map(o => {
          const [la, lo] = (o.location || "").split(",").map(Number);
          const km = isFinite(la) ? Math.round(KM(lat, lng, la, lo)) : null;
          return `<a class="fg-obs" href="${esc(o.uri)}" ${ext}><span class="fg-obs-img"><img src="${esc(size(o.photos[0].url, "medium"))}" alt="" loading="lazy"></span>
            <span class="fg-obs-when">${esc(o.observed_on ? new Date(o.observed_on + "T12:00").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}) : "")}</span>
            <span class="fg-obs-where">${esc([o.place_guess, km !== null ? `${km} km away` : ""].filter(Boolean).join(" · "))}</span></a>`;
        }).join("")}</div>`);
        return;
      }
    }
    $("s-near").hidden = true;
  }, () => { if($("s-near")) $("s-near").hidden = true; }, {maximumAge: 600000, timeout: 15000});
  if(state === "granted") return run();
  /* not asked yet: offer, rather than ask the moment the page opens */
  show("s-near", `<p class="fg-ask"><button type="button" class="ghost" id="fg-locate">Show sightings near me</button></p>`);
  $("s-near").querySelector(".sub").textContent = "Sightings around where you are, from iNaturalist — your location stays in this browser";
  $("fg-locate").onclick = () => { $("fg-locate").disabled = true; $("fg-locate").textContent = "Finding you…"; run(); };
}

/* ---------- a group: a family, an order, a genus… ---------- */
async function groupPage(ctx){
  const {t, e, name} = ctx;
  const me = {...node(t), sub: t.name};
  const parent = (t.ancestors || []).at(-1);
  const parentName = parent ? cap(parent.preferred_common_name || parent.name) : "";
  $("views").innerHTML = section("s-members", "Seen in the Pacific Northwest", "")
    + section("s-range", "Range & season", "")
    + section("s-tree", "Before & after", "Where it sits in the tree of life: what it belongs to, and what it divides into")
    + section("s-also", parent ? `Also in ${parentName}` : "Also", "Its nearest relatives, most seen first");
  $("readon").closest(".readon").insertAdjacentHTML("beforebegin", status(t, e));
  setFacts([["Scientific name", sciHtml(t.name, t.rank_level)], ["Rank", esc(cap(t.rank))],
    ["Belongs to", parent ? `<a href="${esc(here(wikiTitle(parent.wikipedia_url) || parent.name))}">${esc(parentName)}</a>` : ""],
    ["Species", t.complete_species_count ? esc(num(t.complete_species_count)) : ""], ["On iNaturalist", t.observations_count ? esc(num(t.observations_count) + " sightings") : ""]]);

  /* its members, most seen first: in the Northwest if it has enough here, else worldwide */
  (async () => {
    let list = await counts({taxon_id: t.id, place_id: PNW, per_page: 200}).catch(() => []), where = "Pacific Northwest";
    if(list.length < 6){ list = await counts({taxon_id: t.id, per_page: 200}).catch(() => []); where = ""; }
    if(!alive(ctx) || list.length < 2) return;
    const sec = $("s-members");
    if(!where) sec.querySelector("h2").textContent = "Its members";
    sec.querySelector(".sub").textContent = where ? "Species seen here, most sightings first, from iNaturalist" : "Its most-seen species around the world, from iNaturalist";
    sec.hidden = false;
    membersWall(ctx, sec.querySelector(".body"), list);
  })();

  rangeAndSeason(ctx, {taxon_id: t.id}, claimStr(e, "P846"), t.name);

  /* before & after: its parent, then its children (most seen first) */
  (async () => {
    let kids = [];
    try { kids = (await nat("taxa", {parent_id: t.id, is_active: "true", order_by: "observations_count", per_page: 10})).results.filter(x => x.default_photo).map(node); } catch(err){}
    if(!alive(ctx) || (!parent && !kids.length)) return;
    show("s-tree", `<div class="before-after fg-tree">
      ${parent ? `<div class="ba-col"><h3 class="minor">Belongs to</h3><div class="ba-list"><div class="ba-item">${card({...node(parent), sub: parent.name, rankLevel: parent.rank_level})}<span class="ba-how">${esc(parent.rank)}</span></div></div></div>` : `<div class="ba-col"></div>`}
      <div class="ba-this"><span class="ba-arrow" aria-hidden="true">→</span>${card({...me, rankLevel: t.rank_level})}${kids.length ? `<span class="ba-arrow" aria-hidden="true">→</span>` : ""}</div>
      ${kids.length ? `<div class="ba-col"><h3 class="minor">Divides into</h3><div class="ba-list">${kids.slice(0, 8).map(k => `<div class="ba-item">${card({...k, rankLevel: k.rankLevel})}<span class="ba-how">${esc(k.rank)}</span></div>`).join("")}</div></div>` : `<div class="ba-col"></div>`}
    </div>`);
  })();

  /* also in its parent: its siblings */
  if(parent) nat("taxa", {parent_id: parent.id, is_active: "true", order_by: "observations_count", per_page: 16}).then(j => {
    const sibs = j.results.filter(x => x.id !== t.id && x.default_photo).map(node);
    if(alive(ctx) && sibs.length >= 2) show("s-also", `<div class="wall strip fg-strip">${sibs.map(x => card(x)).join("")}</div>`);
  }).catch(() => {});
}

/* ---------- a wild place: what lives there ---------- */
async function placePage(ctx){
  const {name, lat, lng} = ctx, month = thisMonth();
  const prev = (month + 10) % 12 + 1, next = month % 12 + 1;
  $("views").innerHTML = section("s-members", "What lives here", "The species seen most within 10 km, from iNaturalist")
    + section("s-tree", "Before & after", `What's seen here in ${MONTHS[prev - 1]}, now, and in ${MONTHS[next - 1]}`)
    + section("s-also", "Also nearby", "Seen within 50 km, but not in the middle");
  const at = {lat, lng};
  (async () => {
    const list = await counts({...at, radius: 10, per_page: 200}).catch(() => []);
    if(!alive(ctx) || list.length < 3) return;
    ctx.here = new Set(list.map(x => x.node.id));
    $("s-members").hidden = false;
    membersWall(ctx, $("s-members").querySelector(".body"), list);
    const wide = await counts({...at, radius: 50, per_page: 80}).catch(() => []);
    const more = wide.filter(x => !ctx.here.has(x.node.id)).slice(0, 16);
    if(alive(ctx) && more.length >= 4) show("s-also", `<div class="wall strip fg-strip">${more.map(x => card(x.node)).join("")}</div>`);
  })();
  (async () => {
    const [a, b, c] = await Promise.all([prev, month, next].map(m => counts({...at, radius: 15, month: m, per_page: 12}).catch(() => [])));
    if(!alive(ctx) || (!a.length && !c.length) || !b.length) return;
    const col = (label, l) => `<div class="ba-col"><h3 class="minor">${esc(label)}</h3>${l.length ? `<div class="ba-list">${l.slice(0, 6).map(x => `<div class="ba-item">${card(x.node)}</div>`).join("")}</div>` : ""}</div>`;
    /* the middle is this month's most-seen; the sides lead with what differs from it */
    const nowIds = new Set(b.slice(0, 6).map(x => x.node.id));
    const differ = l => [...l.filter(x => !nowIds.has(x.node.id)), ...l.filter(x => nowIds.has(x.node.id))];
    show("s-tree", `<div class="before-after fg-tree">${col(MONTHS[prev - 1], differ(a))}
      <div class="ba-this"><span class="ba-arrow" aria-hidden="true">→</span>${card({...b[0].node}, `most seen in ${MONTHS[month - 1]}`)}<span class="ba-arrow" aria-hidden="true">→</span></div>
      ${col(MONTHS[next - 1], differ(c))}</div>`);
  })();
}

/* ---------- navigation ---------- */
/* a name to a page: iNaturalist knows common names (and misspellings) best; Wikipedia knows everything else */
async function search(q, quiet=false){
  q = q.trim(); if(!q) return;
  document.body.classList.add("on"); if(!quiet) shell();
  try {
    const [na, wi] = await Promise.allSettled([nat("taxa/autocomplete", {q, per_page: 5, is_active: "true"}), wikiSearch(q)]);
    const taxa = na.value?.results || [], hits = wi.value || [];
    const low = q.toLowerCase();
    const exact = taxa.find(x => [x.matched_term, x.name, x.preferred_common_name].some(s => s?.toLowerCase() === low));
    const wikiExact = hits.find(h => h.toLowerCase() === low || h.toLowerCase().replace(/ \(.*\)$/, "") === low);
    const pick = exact ? (wikiTitle(exact.wikipedia_url) || exact.name) : wikiExact || (taxa[0] && taxa[0].matched_term?.toLowerCase().startsWith(low) ? wikiTitle(taxa[0].wikipedia_url) || taxa[0].name : hits[0]);
    if(!pick){ $("lead").innerHTML = `<p class="status">Nothing found for “${esc(q)}”. Try different words.</p>`; return; }
    if(quiet && pick === q) { $("lead").innerHTML = `<p class="status">Couldn't load that. Try again in a moment.</p>`; return; }
    go(pick, hits, quiet ? "" : q, quiet);
  } catch(e){ $("lead").innerHTML = `<p class="status">Couldn't reach the library right now.</p>`; }
}
function go(title, others=[], query="", replace=false){
  history[replace ? "replaceState" : "pushState"]({title, others, query}, "", "?t=" + encodeURIComponent(title));
  openTopic(title, others, query || "");
}
function landing(){ token++; stop(); Myriad.shelves?.clear(); document.body.classList.remove("on"); $("q").value = ""; document.title = "Field Guide — Myriad"; }
window.addEventListener("popstate", e => {
  if(e.state?.title) openTopic(e.state.title, e.state.others, e.state.query);
  else { const t = new URLSearchParams(location.search).get("t"); t ? openTopic(t) : landing(); }
});
$("f").addEventListener("submit", e => { e.preventDefault(); search($("q").value); });
$("q").addEventListener("search", () => { if(!$("q").value && document.body.classList.contains("on")){ history.pushState(null, "", location.pathname); landing(); } });
/* links to other Field Guide topics open in place, without reloading the page */
document.addEventListener("click", e => {
  const a = e.target.closest("a[href^='./?t=']"); if(!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault(); go(new URL(a.getAttribute("href"), location.href).searchParams.get("t"));
});
/* a picture that fails to load becomes a cloth cover, or goes */
document.addEventListener("error", e => {
  const img = e.target; if(img.tagName !== "IMG") return;
  if(img.id === "pic") $("plate").hidden = true;
  else if(img.closest(".frame")) img.outerHTML = `<span class="cover">${esc(img.dataset.t || "")}</span>`;
  else if(img.closest(".fg-stills a, .fg-obs")) (img.closest(".fg-stills a") || img.closest(".fg-obs")).remove();
  else if(img.closest(".dc-img, .dn-img, .dt-img")) img.outerHTML = `<span class="dc-ini">·</span>`;
}, true);

/* shared with the front page (landing.js) */
window.FieldGuide = {getJSON, nat, PNW, MONTHS, GROUP, thisMonth, size, cap, node, card, counts, here, wikiTitle, sciHtml, num,
  commonsSounds, natSounds, verified, playable, trackList, stop, capped, go, audio: AUDIO};

const p = new URLSearchParams(location.search);
if(p.get("t")) openTopic(p.get("t"));
else if(p.get("q")) search(p.get("q"));
}
