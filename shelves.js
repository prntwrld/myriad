/* Myriad — the library shelves, shared by every topic page (the front page's and every wing's):
   free books, the Met, the Internet Archive and the Library of Congress. A shelf appears only once it has
   found something, so a topic with no museum objects simply has no museum shelf.
   Myriad.shelves.render(host, {title, description, short}) — host is an empty element to fill. */
{
const {esc} = window.Myriad;
/* fetch JSON with a time limit, and one polite retry if a service says "too many requests" (HTTP 429) */
const getJSON = async (url, ms=15000, tries=2) => {
  const r = await fetch(url, {signal: AbortSignal.timeout(ms)});
  if(r.status === 429 && tries > 1){ await new Promise(ok => setTimeout(ok, 1500)); return getJSON(url, ms, tries-1); }
  if(!r.ok) throw new Error(r.status);
  return r.json();
};
/* one object on a shelf: the thing itself standing on the plank, a placard underneath */
const ext = `target="_blank" rel="noopener"`;
const cover = (t, shelf) => `<span class="cover${shelf === "ia" ? " grey" : ""}">${esc(t)}</span>`;
const item = ({u,t,m,img}, shelf) => `<a class="item" href="${esc(u)}" ${ext}>
  <div class="obj">${img ? `<img loading="lazy" src="${esc(img)}" alt="" data-t="${esc(t)}">` : cover(t, shelf)}</div>
  <div class="placard"><div class="t">${esc(t)}</div>${m?`<div class="m">${esc(m)}</div>`:""}</div></a>`;

/* ---------- other libraries ---------- */
/* A shelf searches for the topic's name plus a word or two saying which meaning is wanted, so that
   "Mercury (planet)" finds the planet rather than the element, the god or Freddie Mercury.
   The words come from the bracketed qualifier in the title ("planet") and from the head noun of
   Wikipedia's short description ("Semiaquatic rodent" → "rodent", "Largest living species of dolphin" → "dolphin").
   If the sharper search finds nothing, the shelf searches the plain name instead.
   Each search returns {items, url}: the shelf's things, and the library's own results page for that search. */
const GENERIC = /^(species|genus|family|type|kind|group|member|form|class|order|variety|breed|term|name|word|concept|one|part|series|set|list|thing|any|branch|subfamily|suborder|clade)$/;
function meaning(title, desc, name){
  const words = [];
  const qual = /\(([^)]+)\)\s*$/.exec(title)?.[1];
  if(qual) words.push(qual.replace(/[\d–-]+/g, " ").trim().split(/\s+/).pop());
  if(desc){
    const d = desc.toLowerCase();
    let head = d.split(/[,;:(]| (?:in|of|from|with|on|at|by|for|to|that|which|who|whose|and|or|between|near|based|located|born)\b/)[0]
      .trim().split(/\s+/).pop();
    if(GENERIC.test(head)) head = / of (?:the |a |an )?([a-z-]+)/.exec(d)?.[1];
    if(head) words.push(head);
  }
  const own = new Set(name.toLowerCase().split(/\s+/));
  return [...new Set(words.map(w => (w || "").toLowerCase().replace(/[^a-z-]/g, "")))].filter(w => w.length > 2 && !own.has(w));
}
/* "planets" and "planet" both match "planet": a word's stem for wildcard searches and matching */
const stem = w => w.length > 4 && /[^s]s$/.test(w) ? w.slice(0, -1) : w;
const mentions = (text, words) => words.some(w => new RegExp("\\b" + stem(w.toLowerCase()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text));
async function sharpThenPlain(fn, name, words){
  if(words.length){ const r = await fn(name, words); if(r.items.length) return r; }
  return fn(name, []);
}

/* Books: Open Library's public-domain scans (fast, free to read in full on the Internet Archive).
   Gutendex (Project Gutenberg) is the backup, tried once with the plain name and a short time limit,
   because it is often slow or down: if it fails after Open Library answered, the shelf is simply empty. */
async function books(name, words){
  let olError = null;
  try { const r = await sharpThenPlain(openLibrary, name, words); if(r.items.length) return r; } catch(e){ olError = e; }
  try { return await gutenberg(name); } catch(e){
    if(olError) throw olError;
    return {items: [], url: openLibraryUrl(name, [])};
  }
}
const olWords = (name, words) => name.replace(/[:"()\[\]{}]/g, " ") + (words.length ? ` (${words.join(" OR ")})` : "") + " AND ebook_access:public";
const openLibraryUrl = (name, words) => "https://openlibrary.org/search?mode=everything&q=" + encodeURIComponent(olWords(name, words));
async function openLibrary(name, words){
  const j = await getJSON("https://openlibrary.org/search.json?limit=6&fields=title,author_name,first_publish_year,cover_i,ia&q="
    + encodeURIComponent(olWords(name, words)), 10000);
  return {url: openLibraryUrl(name, words), items: (j.docs||[]).filter(b => b.ia?.length).map(b => ({u:`https://archive.org/details/${b.ia[0]}`, t:b.title,
    m:[(b.author_name||[])[0], b.first_publish_year].filter(Boolean).join(" · "),
    img: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : ""}))};
}
async function gutenberg(name){
  const j = await getJSON("https://gutendex.com/books/?search=" + encodeURIComponent(name), 8000, 1);
  return {url: "https://www.gutenberg.org/ebooks/search/?query=" + encodeURIComponent(name),
    items: (j.results||[]).slice(0,6).map(b => ({u:`https://www.gutenberg.org/ebooks/${b.id}`, t:b.title,
    m:(b.authors||[]).map(a=>a.name).join(", "), img:b.formats?.["image/jpeg"]}))};
}

/* Museum: the Met's search is loose (it also matches artists' names and other fields), so an object
   stays on the shelf only if its title or subject tags name the topic, or, for the sharper search,
   the meaning ("Planets"). An artist called John van Beaver no longer lands on the Beaver shelf.
   A name that appears only in brackets in a title (usually a source, "(John Beaver, 1725)") ranks last,
   and no artist gets more than two places. */
async function met(name, words){
  const q = [name, ...words].join(" ");
  /* v1.1 search (the old v1 search was retired in Oct 2026 and now returns 410 Gone) */
  const s = await getJSON("https://collectionapi.metmuseum.org/public/collection/v1.1/search?hasImages=true&limit=20&q=" + encodeURIComponent(q));
  const objs = await Promise.all((s.objectIDs||[]).slice(0,20).map(id =>
    getJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).catch(()=>null)));
  const want = words.length ? words : [name], perArtist = {};
  const scored = objs.filter(o => o && o.primaryImageSmall).map(o => {
    const tags = (o.tags||[]).map(t => t.term).join(" "), bare = (o.title||"").replace(/\([^)]*\)/g, " ");
    const score = mentions(bare + " " + tags + " " + (o.objectName||""), want) ? 2 : mentions(o.title||"", want) ? 1 : 0;
    return {o, score};
  }).filter(x => x.score).sort((a,b) => b.score - a.score).filter(({o}) => {
    const k = o.artistDisplayName || o.objectID; perArtist[k] = (perArtist[k]||0) + 1; return perArtist[k] <= 2;
  });
  return {url: "https://www.metmuseum.org/art/collection/search?showOnly=withImage&q=" + encodeURIComponent(q),
    items: scored.slice(0,6).map(({o}) => ({u:o.objectURL, t:o.title,
    m:[o.artistDisplayName,o.objectDate].filter(Boolean).join(" · "), img:o.primaryImageSmall}))};
}

/* Archive: title matches inside the Archive's curated library collections (digitized library books, LibriVox
   audiobooks, Prelinger films, old-time radio, NASA, Smithsonian…), most-downloaded first; the sharper search
   also asks for the meaning among the item's subjects ("planet*").
   Searching everything returns personal uploads, favorites lists and some adult material. */
async function archive(name, words){
  const t = name.replace(/["()\[\]{}:*]/g, " ").trim();
  const lib = "americana OR library_of_congress OR biodiversity OR fedlink OR prelinger OR librivoxaudio OR oldtimeradio OR feature_films OR nasa OR smithsonian OR gutenberg OR internetarchivebooks";
  const subj = words.length ? ` AND subject:(${words.map(w => stem(w) + "*").join(" OR ")})` : "";
  const q = `title:("${t}")${subj} AND collection:(${lib}) AND NOT mediatype:collection`;
  const j = await getJSON("https://archive.org/advancedsearch.php?fl[]=identifier&fl[]=title&fl[]=mediatype&fl[]=year&rows=6&sort[]=downloads+desc&output=json&q="
    + encodeURIComponent(q));
  return {url: "https://archive.org/search?query=" + encodeURIComponent(q),
    items: (j.response?.docs||[]).map(d => ({u:`https://archive.org/details/${d.identifier}`, t:d.title,
    m:[d.mediatype,d.year].filter(Boolean).join(" · "), img:`https://archive.org/services/img/${d.identifier}`}))};
}

/* Photographs: the Library of Congress. Its search often takes 10–30 seconds, so it starts only after
   the other shelves are done (or after a few seconds), gets one try with a 30-second limit, and is
   cancelled when the reader moves on. Restricted items and "group of images" placeholders are skipped.
   Its search treats extra words loosely ("Mercury planet" brings back books on lithography), so instead of a
   second, sharper search it asks once for the plain name and puts first the photographs whose subjects or title
   carry the meaning ("whales" for Orca), or whose subject is the thing itself ("beavers" for Beaver). */
let locStop = null;
async function photos(name, words){
  locStop?.abort(); locStop = new AbortController();
  const signal = AbortSignal.any ? AbortSignal.any([locStop.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
  const q = "q=" + encodeURIComponent(name) + "&fa=online-format:image";
  const r = await fetch("https://www.loc.gov/photos/?fo=json&at=results&c=40&" + q, {signal});
  if(!r.ok) throw new Error(r.status);
  const j = await r.json();
  const plural = name.toLowerCase() + "s";
  const items = (j.results||[]).filter(x => !x.access_restricted).map(x => {
    /* image_url lists sizes as "...jpg#h=150&w=114": take the smallest that is at least 300px across */
    const sizes = (x.image_url||[]).filter(u => /\.jpg(#|$)/.test(u)).map(u => {
      const h = +(/[#&]h=(\d+)/.exec(u)||[])[1] || 0, w = +(/[#&]w=(\d+)/.exec(u)||[])[1] || 0;
      return {u: u.split("#")[0], n: Math.max(h, w)};
    }).sort((a,b) => a.n - b.n);
    const img = (sizes.find(z => z.n >= 300) || sizes.at(-1))?.u;
    const year = /^\d{4}/.exec(x.date || "")?.[0];
    const subjects = (x.subject||[]).map(z => String(z).toLowerCase());
    const fits = (words.length && mentions([x.title, ...subjects].join(" "), words)) || subjects.includes(plural);
    return img && {u: String(x.url || x.id).replace(/^(https?:)?\/\//, "https://"), t: x.title,
      m: [(x.contributor||[])[0], year].filter(Boolean).join(" · "), img, fits};
  }).filter(Boolean);
  return {url: "https://www.loc.gov/photos/?" + q,
    items: [...items.filter(x => x.fits), ...items.filter(x => !x.fits)].slice(0,6)};
}


/* ---------- the shelves on a page ---------- */
const SHELVES = [
  ["books", "Free books", "Public-domain books, free to read in full — Open Library & Project Gutenberg", books],
  ["met", "Museum", "The Metropolitan Museum of Art — open access", (n, w) => sharpThenPlain(met, n, w)],
  ["ia", "Archive", "Internet Archive — books, film, audio", (n, w) => sharpThenPlain(archive, n, w)],
  ["loc", "Photographs", "Library of Congress — prints & photographs", photos]];
let run = 0;
function render(host, {title, description, short}){
  const me = ++run; locStop?.abort();
  host.innerHTML = SHELVES.map(([id, label, sub]) => `<section class="section shelf lib" data-shelf="${id}" hidden><h2 class="label">${esc(label)}</h2>
    <p class="sub">${esc(sub)}<a class="more" hidden ${ext}>See all results</a></p><div class="row"></div></section>`).join("");
  const words = meaning(title, description || "", short || title);
  const fill = ([id, , , fn]) => fn(short || title, words).then(r => {
    if(me !== run || !r.items.length) return;
    const sec = host.querySelector(`[data-shelf="${id}"]`); if(!sec) return;
    sec.querySelector(".row").innerHTML = r.items.map(x => item(x, id)).join("");
    const a = sec.querySelector(".more"); if(r.url){ a.href = r.url; a.hidden = false; }
    sec.hidden = false;
  }).catch(() => {});
  const first = SHELVES.slice(0, 3).map(fill);
  /* the slow Library of Congress goes last */
  Promise.race([Promise.allSettled(first), new Promise(ok => setTimeout(ok, 4000))]).then(() => { if(me === run) fill(SHELVES[3]); });
}
function clear(host){ run++; locStop?.abort(); if(host) host.innerHTML = ""; }

/* a shelf picture that fails to load becomes a plain cloth cover with the title */
document.addEventListener("error", e => {
  const img = e.target;
  if(img.tagName === "IMG" && img.closest("[data-shelf] .obj")) img.outerHTML = cover(img.dataset.t || "", img.closest("[data-shelf]").dataset.shelf);
}, true);

window.Myriad.shelves = {render, clear, meaning};
}
