/* Myriad — Observatory. Topic pages for planets, moons, stars, galaxies, nebulae and the missions that went to them.
   Wikipedia gives the words and the picture at the top (from Wikimedia Commons); Wikidata gives the numbers, the missions,
   the discoveries and the neighbours; the NASA Image and Video Library gives the wall of pictures; the sky itself is
   worked out in the browser (sky.js). */
{
const {esc} = window.Myriad, Sky = window.Sky;
const $ = id => document.getElementById(id);
const ext = `target="_blank" rel="noopener"`;
const W = "https://en.wikipedia.org/w/api.php?format=json&origin=*&";
const WD = "https://www.wikidata.org/w/api.php?format=json&origin=*&";
let token = 0;

/* fetch JSON with a time limit, and up to two polite retries if a service says "too many requests" */
const getJSON = async (url, ms = 20000, tries = 3, opts = {}) => {
  const r = await fetch(url, {signal: AbortSignal.timeout(ms), ...opts});
  if(r.status === 429 && tries > 1){ await new Promise(ok => setTimeout(ok, 1200 * (4 - tries) + Math.random() * 600)); return getJSON(url, ms, tries - 1, opts); }
  if(!r.ok) throw new Error(r.status);
  return r.json();
};
const sparql = q => getJSON("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), 30000, 3,
    {headers: {"Api-User-Agent": "Myriad/1.0 (https://prntwrld.github.io/myriad/)"}})
  .then(j => j.results.bindings.map(b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value]))));
const qid = uri => uri?.replace(/^.*\//, "");
const label = (b, k) => { const v = b[k + "Label"]; return v && !/^Q\d+$/.test(v) ? v : ""; };
const artTitle = u => u ? decodeURIComponent(u.replace(/^.*\/wiki\//, "")).replace(/_/g, " ") : "";
/* a Commons file → a thumbnail, at one of the standard widths Wikimedia serves */
const commons = (u, w = 330) => u ? u.replace(/^http:/, "https:") + "?width=" + ([120, 250, 330, 500, 960].find(x => x >= w) || 960) : "";
const filePath = f => f ? "http://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(f) : "";
const here = t => `./?t=${encodeURIComponent(t)}`;
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const num = (n, d = 0) => Number(n).toLocaleString("en-US", {maximumFractionDigits: d});
/* a name without its bracketed qualifier: "Europa (moon)" → "Europa" */
const bare = t => String(t || "").replace(/ \((moon|planet|spacecraft|space probe|galaxy|star|nebula|satellite|rover|lander|mission|dwarf planet|constellation|comet|telescope|observatory)\)$/i, "");

/* ---------- Wikipedia ---------- */
/* a search that prefers the astronomical meaning: "Mercury" → Mercury (planet), not the element */
const SPACEY = /planet|moon|satellite|star\b|stars|galax|nebula|cluster|comet|asteroid|spacecraft|space probe|mission|telescope|rover|lander|constellation|astronom|orbit|space|solar|lunar|cosmic|supernova|black hole|quasar|pulsar|rocket|astronaut|cosmonaut/i;
async function wikiSearch(q, n = 8){
  const j = await getJSON(W + "action=query&generator=search&gsrnamespace=0&prop=description&gsrlimit=" + n + "&gsrsearch=" + encodeURIComponent(q));
  const hits = Object.values(j.query?.pages || {}).sort((a, b) => a.index - b.index);
  const spacey = hits.filter(h => SPACEY.test(h.description || "") && !/disambiguation/i.test(h.description || ""));
  return [...spacey, ...hits.filter(h => !spacey.includes(h))].map(h => h.title);
}
const summary = t => getJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t.replace(/ /g, "_")));
const entity = async id => (await getJSON(WD + "action=wbgetentities&props=claims|sitelinks&sitefilter=enwiki&ids=" + id)).entities?.[id] || {};

/* each article's lead picture and one-line description, 50 titles a request, remembered between pages */
const picCache = {};
async function pics(titles, size = 330){
  const need = [...new Set(titles.filter(t => t && !(t in picCache)))];
  for(let i = 0; i < need.length; i += 50){
    const batch = need.slice(i, i + 50);
    try {
      const j = await getJSON(W + `action=query&prop=pageimages|description&piprop=thumbnail&pithumbsize=${size}&pilicense=any&redirects=1&titles=` + encodeURIComponent(batch.join("|")));
      const back = {};
      for(const m of [...(j.query?.normalized || []), ...(j.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
      batch.forEach(t => picCache[t] = picCache[t] || {src: "", desc: ""});
      for(const p of Object.values(j.query?.pages || {})) picCache[back[p.title] || p.title] = {src: p.thumbnail?.source || "", desc: p.description || "", title: p.title};
    } catch(e){}
  }
  return picCache;
}

/* ---------- Wikidata claims ---------- */
const live = (e, p) => {
  const all = (e.claims?.[p] || []).filter(c => c.rank !== "deprecated" && c.mainsnak?.datavalue);
  const pref = all.filter(c => c.rank === "preferred");
  return pref.length ? pref : all;
};
const claimIds = (e, p) => live(e, p).map(c => c.mainsnak.datavalue.value?.id).filter(Boolean);
const claimStr = (e, p) => live(e, p)[0]?.mainsnak.datavalue.value;
const timeOf = v => {
  if(!v?.time) return null;
  const m = v.time.match(/^([+-])(\d+)-(\d\d)-(\d\d)/); if(!m) return null;
  const y = +m[2] * (m[1] === "-" ? -1 : 1);
  return {y, m: +m[3], d: +m[4], precision: v.precision, date: Date.UTC(Math.max(y, 0), Math.max(+m[3], 1) - 1, Math.max(+m[4], 1))};
};
const claimTime = (e, p) => timeOf(claimStr(e, p));
const showTime = t => !t ? "" : t.precision >= 11 && t.m && t.d
  ? new Date(t.date).toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric", timeZone: "UTC"})
  : t.precision === 10 && t.m ? new Date(t.date).toLocaleDateString("en-US", {year: "numeric", month: "long", timeZone: "UTC"}) : t.y < 0 ? `${-t.y} BC` : String(t.y);

/* quantities, converted to one unit per kind: km, kg, days, kelvin, m/s², watts */
const UNIT = {
  Q828224: ["km", 1], Q11573: ["km", 1e-3], Q1155470: ["km", 6371], Q3421309: ["km", 71492], Q48440: ["km", 695700],
  Q1811: ["km", 149597870.7], Q531: ["km", 9.4607e12], Q12129: ["km", 3.0857e13], Q11929860: ["km", 3.0857e16], Q3773454: ["km", 3.0857e19],
  Q11570: ["kg", 1], Q41803: ["kg", 1e-3], Q191118: ["kg", 1e3], Q613726: ["kg", 1e21], Q115359865: ["kg", 1e24], Q681996: ["kg", 5.9722e24],
  Q651336: ["kg", 1.89813e27], Q180892: ["kg", 1.98847e30],
  Q573: ["day", 1], Q25235: ["day", 1 / 24], Q7727: ["day", 1 / 1440], Q11574: ["day", 1 / 86400], Q577: ["day", 365.25], Q1092296: ["day", 365.25],
  Q20764: ["year", 1e6], Q524410: ["year", 1e9], Q3013059: ["year", 1e3],
  Q11579: ["K", 1], Q1051665: ["g", 1], Q39699418: ["g", 1], Q215571: ["g", 1], Q5879479: ["W", 1], Q843877: ["W", 3.828e26], Q25343: ["W", 1e3]
};
/* all the values of a quantity, converted; [] if none is in a unit we know */
function quantities(e, p, kind){
  return live(e, p).map(c => {
    const v = c.mainsnak.datavalue.value; if(!v?.amount) return null;
    const u = String(v.unit || "").replace(/^.*\//, "");
    const at = timeOf(c.qualifiers?.P585?.[0]?.datavalue?.value);
    if(u === "Q25267" && kind === "K") return {v: +v.amount + 273.15, at};   /* degrees Celsius */
    const conv = UNIT[u]; if(!conv || (kind && conv[0] !== kind)) return null;
    return {v: +v.amount * conv[1], at};
  }).filter(Boolean);
}
/* one value: the latest dated one (a spacecraft's distance changes), else the middle one */
const quantity = (e, p, kind) => {
  const q = quantities(e, p, kind); if(!q.length) return null;
  const dated = q.filter(x => x.at).sort((a, b) => b.at.date - a.at.date);
  if(dated.length) return dated[0].v;
  const s = q.map(x => x.v).sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)];
};
const amount = (e, p) => { const v = claimStr(e, p); return v?.amount !== undefined ? +v.amount : null; };

/* names, pictures and articles for some Wikidata items */
const describe = ids => ids.length ? sparql(`SELECT ?x ?xLabel (SAMPLE(?img) AS ?pic) (SAMPLE(?logo) AS ?patch) (SAMPLE(?art) AS ?a) (SAMPLE(?d) AS ?desc) WHERE {
  VALUES ?x { ${[...new Set(ids)].map(i => "wd:" + i).join(" ")} }
  OPTIONAL { ?x wdt:P18 ?img } OPTIONAL { ?x wdt:P154 ?logo } OPTIONAL { ?art schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> }
  OPTIONAL { ?x schema:description ?d . FILTER(LANG(?d) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?x ?xLabel`).then(rows => Object.fromEntries(rows.map(r => [qid(r.x), {id: qid(r.x), name: label(r, "x"), pic: r.pic, patch: r.patch, title: artTitle(r.a), desc: r.desc || ""}]))) : Promise.resolve({});

/* ---------- what kind of thing it is ---------- */
const has = (e, p) => !!live(e, p).length;
const isHuman = e => claimIds(e, "P31").includes("Q5");
const isMission = e => has(e, "P619") || claimIds(e, "P31").some(q => ["Q26529", "Q40218", "Q148578", "Q752783", "Q2133344", "Q18819669", "Q1144661", "Q209363"].includes(q));
const isObject = e => ["P59", "P397", "P2583", "P6257", "P6258", "P1096", "P2146", "P398", "P2120", "P1215"].some(p => has(e, p));

/* ---------- missions that went somewhere, and what a mission went to ---------- */
/* everything that flew past, orbited, landed on or was sent to a body, with the date it got there (or launched) */
const visitors = id => sparql(`SELECT ?m ?mLabel (GROUP_CONCAT(DISTINCT ?how0; separator=",") AS ?how) (MIN(?when0) AS ?when) (MIN(?l) AS ?launch)
  (SAMPLE(?logo) AS ?patch) (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) WHERE {
  { ?m wdt:P1444 wd:${id} . BIND("to" AS ?how0) } UNION { ?m wdt:P397 wd:${id} . BIND("orbit" AS ?how0) }
  UNION { ?m wdt:P376 wd:${id} . BIND("land" AS ?how0) } UNION { ?m wdt:P1158 wd:${id} . BIND("land" AS ?how0) }
  UNION { ?m p:P793 ?st . ?st ps:P793 ?ev . { ?st pq:P2210 wd:${id} } UNION { ?st pq:P376 wd:${id} }
    OPTIONAL { ?st pq:P585 ?t1 } OPTIONAL { ?st pq:P580 ?t2 } BIND(COALESCE(?t1, ?t2) AS ?when0)
    ?ev rdfs:label ?evl . FILTER(LANG(?evl) = "en")
    BIND(IF(CONTAINS(?evl, "flyby") || CONTAINS(?evl, "fly-by"), "flyby", IF(CONTAINS(?evl, "land") || CONTAINS(?evl, "touchdown"), "land",
      IF(CONTAINS(?evl, "orbit"), "orbit", IF(CONTAINS(?evl, "impact"), "impact", "visit")))) AS ?how0) }
  ?m wdt:P619 ?l . ?art schema:about ?m ; schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?m wdt:P154 ?logo } OPTIONAL { ?m wdt:P18 ?img }
  ?m wikibase:sitelinks ?sl .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?m ?mLabel ORDER BY ?launch LIMIT 300`);
const HOW = {flyby: "Flew past", orbit: "Orbited", land: "Landed", impact: "Struck it", to: "Sent there", visit: "Visited"};
/* the strongest thing a mission did there: landing beats orbiting beats flying past */
const howOf = s => { const l = (s || "").split(","); return ["land", "impact", "orbit", "flyby", "visit", "to"].find(k => l.includes(k)) || "visit"; };
const visitRows = rows => {
  const seen = new Set();
  return rows.map(r => {
    const when = r.when && new Date(r.when) < new Date(Date.now() + 3e10) ? r.when : r.launch;
    const y = +String(when || "").slice(0, 4);
    return {id: qid(r.m), name: label(r, "m") || artTitle(r.a), title: artTitle(r.a), how: howOf(r.how), year: y, launch: +String(r.launch).slice(0, 4),
      future: Date.parse(r.launch) > Date.now(), patch: r.patch, pic: r.pic, pop: +r.pop || 0};
  }).filter(m => m.name && m.title && !seen.has(m.title) && seen.add(m.title)).sort((a, b) => a.year - b.year || b.pop - a.pop);
};

/* a mission's destinations: where it was sent, and each flyby, orbit or landing on the way, dated */
const destinations = id => sparql(`SELECT ?t ?tLabel (MIN(?when0) AS ?when) (GROUP_CONCAT(DISTINCT ?how0; separator=",") AS ?how) (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) WHERE {
  { wd:${id} wdt:P1444 ?t . BIND("to" AS ?how0) } UNION { wd:${id} wdt:P397 ?t . BIND("orbit" AS ?how0) }
  UNION { wd:${id} wdt:P376 ?t . BIND("land" AS ?how0) }
  UNION { wd:${id} p:P793 ?st . ?st ps:P793 ?ev . ?st pq:P2210 ?t . OPTIONAL { ?st pq:P585 ?t1 } OPTIONAL { ?st pq:P580 ?t2 } BIND(COALESCE(?t1, ?t2) AS ?when0)
    ?ev rdfs:label ?evl . FILTER(LANG(?evl) = "en")
    BIND(IF(CONTAINS(?evl, "flyby"), "flyby", IF(CONTAINS(?evl, "land"), "land", IF(CONTAINS(?evl, "orbit"), "orbit", "visit"))) AS ?how0) }
  ?t wikibase:sitelinks ?sl . FILTER(?sl >= 5) ?art schema:about ?t ; schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?t wdt:P18 ?img }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?t ?tLabel ORDER BY ?when LIMIT 40`);

/* what a mission (or a person) discovered */
const discoveries = id => sparql(`SELECT ?x ?xLabel (MIN(?d) AS ?when) (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) WHERE {
  ?x wdt:P61 wd:${id} . OPTIONAL { ?x wdt:P575 ?d } OPTIONAL { ?x wdt:P18 ?img }
  ?art schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> . ?x wikibase:sitelinks ?sl .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?x ?xLabel ORDER BY DESC(?pop) LIMIT 200`);

/* missions in a programme (Apollo), in order */
const programme = id => sparql(`SELECT ?m ?mLabel (MIN(?l) AS ?launch) (SAMPLE(?logo) AS ?patch) (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) WHERE {
  ?m wdt:P361 wd:${id} ; wdt:P619 ?l . ?art schema:about ?m ; schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?m wdt:P154 ?logo } OPTIONAL { ?m wdt:P18 ?img } ?m wikibase:sitelinks ?sl .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?m ?mLabel ORDER BY ?launch LIMIT 200`);

/* the best-known things sharing something with this one: the same parent body, constellation, launch year or discovery year */
const neighbours = (what, id) => sparql(`SELECT ?x ?xLabel (SAMPLE(?img) AS ?pic) (SAMPLE(?logo) AS ?patch) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) (MIN(?y0) AS ?y) WHERE {
  ${what}
  FILTER(?x != wd:${id}) ?x wikibase:sitelinks ?sl . ?art schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?x wdt:P18 ?img } OPTIONAL { ?x wdt:P154 ?logo }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?x ?xLabel ORDER BY DESC(?pop) LIMIT 24`);
const yearSpan = (p, y) => `?x wdt:${p} ?d0 . FILTER(?d0 >= "${y}-01-01T00:00:00Z"^^xsd:dateTime && ?d0 < "${y + 1}-01-01T00:00:00Z"^^xsd:dateTime) BIND(YEAR(?d0) AS ?y0)`;

/* ---------- NASA Image and Video Library ---------- */
/* pictures whose title, keywords or caption name the thing; the API's own order (its relevance) otherwise */
async function nasaImages(name, n = 100){
  const j = await getJSON("https://images-api.nasa.gov/search?media_type=image&page_size=" + n + "&q=" + encodeURIComponent(name), 20000, 2);
  const words = name.toLowerCase().replace(/[–—-]/g, " ").split(/\s+/).filter(w => w.length > 1);
  const seen = new Set();
  return (j.collection?.items || []).map(it => {
    const d = it.data?.[0] || {}, link = (it.links || []).find(l => l.rel === "preview") || it.links?.[0];
    const text = [d.title, ...(d.keywords || []), d.description_508 || ""].join(" ").toLowerCase().replace(/[–—-]/g, " ");
    return link?.href && d.nasa_id && words.every(w => text.includes(w)) && {id: d.nasa_id, t: d.title || "", src: link.href,
      u: "https://images.nasa.gov/details/" + encodeURIComponent(d.nasa_id), year: (d.date_created || "").slice(0, 4), center: d.center || ""};
  }).filter(x => x && !seen.has(x.t.toLowerCase()) && seen.add(x.t.toLowerCase()));
}

/* ---------- comparisons people can feel ---------- */
const EARTH = {r: 6371, m: 5.9722e24, g: 9.807}, SUN = {r: 695700, m: 1.98847e30, L: 3.828e26, T: 5772};
const LY = 9.4607e12, AU = 149597870.7, C = 299792.458;
/* a big count in words: 1,300 / 1.3 million / 6 billion */
const words = n => n >= 1e12 ? `${num(n / 1e12, n < 1e13 ? 1 : 0)} trillion` : n >= 1e9 ? `${num(n / 1e9, n < 1e10 ? 1 : 0)} billion`
  : n >= 1e6 ? `${num(n / 1e6, n < 1e7 ? 1 : 0)} million` : n >= 100 ? num(Math.round(n / (n >= 1000 ? 100 : 10)) * (n >= 1000 ? 100 : 10)) : num(n, n < 10 ? 1 : 0);
const round2 = n => n >= 100 ? num(n) : num(n, n >= 10 ? 1 : 2);
/* how long light takes, in the plainest unit */
const lightTime = km => {
  const s = km / C;
  return s < 1 ? `${round2(s * 1000)} thousandths of a second` : s < 120 ? `${round2(s)} seconds` : s < 7200 ? `${num(s / 60, s < 600 ? 1 : 0)} minutes` : s < 172800 ? `${num(s / 3600, s < 36000 ? 1 : 0)} hours`
    : s < 3.156e7 * 2 ? `${num(s / 86400)} days` : `${words(s / 3.156e7)} years`;
};
const dist = km => km < 1e9 ? `${words(km)} km` : km < 0.05 * LY ? `${num(km / AU, km / AU < 10 ? 1 : 0)} AU` : `${words(km / LY)} light-years`;
const ORBITS = [[0.387, "Mercury"], [0.723, "Venus"], [1, "Earth"], [1.524, "Mars"], [5.2, "Jupiter"], [9.58, "Saturn"], [19.2, "Uranus"], [30.1, "Neptune"]];
/* something on Earth about as long as a width */
const SPANS = [[1, "a city block"], [5, "a small town"], [42, "a marathon"], [110, "the English Channel at its longest"], [530, "Lake Superior"],
  [1000, "Great Britain, end to end"], [1240, "Texas"], [2400, "the Mediterranean, Italy to Spain"], [3500, "Australia, north to south"],
  [4000, "Australia, east to west"], [4500, "the United States, coast to coast"], [5570, "London to New York"], [12742, "Earth itself"]];
const likeSpan = km => { const s = SPANS.reduce((m, x) => Math.abs(Math.log(x[0] / km)) < Math.abs(Math.log(m[0] / km)) ? x : m); return Math.abs(Math.log(s[0] / km)) < 0.45 ? s[1] : ""; };
/* where in history the light set out */
const ERAS = [[13.4e9, "when the first galaxies were forming"], [4.6e9, "before the Sun and Earth existed"], [2.5e9, "when Earth's air first filled with oxygen"],
  [540e6, "as the first animals with shells and skeletons appeared"], [230e6, "as the first dinosaurs appeared"], [66e6, "when the dinosaurs were still alive"],
  [6e6, "around when our ancestors split from chimpanzees'"], [2.6e6, "about when the first stone tools were made"], [300e3, "about when our own species appeared"],
  [12e3, "about when farming began"]];
const lightLeft = ly => {
  const y = new Date().getFullYear() - ly;
  if(ly < 1) return "";
  if(ly < 6000) return `The light you see left it around ${y < 0 ? `${num(-Math.round(y / 10) * 10)} BC` : y < 1000 ? `the year ${Math.round(y)}` : Math.round(y)}`;
  const era = ERAS.find(([a]) => ly >= a * 0.9);
  return `The light you see set out ${words(ly)} years ago${era ? `, ${era[1]}` : ""}`;
};
/* a spacecraft's mass as something familiar */
const WEIGHTS = [[25, "a suitcase"], [100, "a fridge"], [450, "a grand piano"], [900, "a small car"], [1500, "a family car"], [6000, "an elephant"],
  [12000, "a bus"], [40000, "a loaded lorry"], [180000, "a blue whale"], [400000, "a jumbo jet"]];

/* the numbers tiles: [{n, unit, what, feel}] for a thing, given its entity, kind and (for planets) today's live distance */
function numbers(e, {kind = "object", live = null, parentName = "", name = ""} = {}){
  const out = [];
  const r = quantity(e, "P2120", "km") ?? (quantity(e, "P2386", "km") ? quantity(e, "P2386", "km") / 2 : null);
  const m = quantity(e, "P2067", "kg"), g = quantity(e, "P7015", "g");
  const period = quantity(e, "P2146", "day"), spin = quantity(e, "P2147", "day");
  const temps = quantities(e, "P2076", "K").map(x => x.v).sort((a, b) => a - b);
  const L = quantity(e, "P2060", "W"), age = quantity(e, "P7584", "year");
  let far = live ?? quantity(e, "P2583", "km");
  const mag = amount(e, "P1215");
  if(kind === "mission"){
    /* how long it flew: to its end, its landing or splashdown, or (still going) to today */
    const launched = claimTime(e, "P619"), ended = claimTime(e, "P582") || claimTime(e, "P730") || claimTime(e, "P2669") || claimTime(e, "P620");
    if(launched && launched.date < Date.now() && (!ended || ended.date >= launched.date)){
      const days = ((ended?.date || Date.now()) - launched.date) / 864e5, yrs = days / 365.25;
      const [n, unit] = yrs >= 2 ? [num(yrs), "years"] : days >= 60 ? [num(days / 30.44), "months"] : [num(Math.max(1, Math.round(days))), days < 1.5 ? "day" : "days"];
      out.push({n, unit, what: ended ? "Mission length" : "In space",
        feel: ended ? (launched.y === ended.y ? `${showTime(launched)} to ${showTime(ended).replace(/, \d+$/, "")}` : `From ${launched.y} to ${ended.y}`)
          : `Launched ${showTime(launched)}${yrs > 31 ? " — longer than most people alive have been" : ""}`});
    }
    if(m){ const w = WEIGHTS.reduce((a, x) => Math.abs(Math.log(x[0] / m)) < Math.abs(Math.log(a[0] / m)) ? x : a);
      const k = m / w[0]; out.push({n: words(m), unit: "kg", what: "Mass", feel: k < 1.5 && k > 0.67 ? `About as heavy as ${w[1]}` : `About as heavy as ${words(k)} × ${w[1].replace(/^an? /, "")}`}); }
    if(far && far > 1e6) out.push({n: dist(far).split(" ")[0], unit: dist(far).split(" ").slice(1).join(" "), what: "From Earth", feel: `A radio message takes ${lightTime(far)} to reach it`});
    return out;
  }
  if(r){
    const big = kind === "galaxy" || r > 1e9;
    if(big) out.push({n: words(2 * r / LY), unit: "light-years across", what: "Size", feel: `Light takes ${words(2 * r / LY)} years to cross it`});
    else if(r > 1.6 * SUN.r){
      const au = r / AU, past = ORBITS.filter(o => au > o[0]).at(-1);
      out.push({n: words(r / SUN.r), unit: "× the Sun's width", what: "Size",
        feel: past ? `Put where the Sun is, it would swallow the planets out past ${past[1]}` : `${words((r / SUN.r) ** 3)} Suns would fit inside`});
    } else if(r > 1.05 * EARTH.r) out.push({n: words(2 * r), unit: "km across", what: "Size", feel: `${words((r / EARTH.r) ** 3)} Earths would fit inside`});
    else if(r < 0.95 * EARTH.r){
      const span = likeSpan(2 * r);
      out.push({n: words(2 * r), unit: "km across", what: "Size", feel: span ? `About as wide as ${span}` : `${words((EARTH.r / r) ** 3)} of it would fit inside Earth`});
    } else out.push({n: words(2 * r), unit: "km across", what: "Size", feel: "Almost exactly Earth's size"});
  }
  if(m){
    if(m > 0.5 * SUN.m) out.push({n: words(m / SUN.m), unit: m > 1e3 * SUN.m ? "Suns" : "× the Sun's mass", what: "Mass", feel: m > 1e6 * SUN.m ? `As much as ${words(m / SUN.m)} stars like the Sun` : `${words(m / EARTH.m)} Earths' worth`});
    else if(m > 1.5 * EARTH.m) out.push({n: words(m / EARTH.m), unit: "× Earth's mass", what: "Mass", feel: m > 300 * EARTH.m ? `It would take ${words(SUN.m / m)} of it to make the Sun` : `As heavy as ${words(m / EARTH.m)} Earths`});
    else if(m < 0.67 * EARTH.m) out.push({n: words(EARTH.m / m), unit: "of it make one Earth", what: "Mass", feel: `${num(100 * m / EARTH.m, m / EARTH.m < 0.01 ? 2 : 1)}% of Earth's mass`});
  }
  if(g && g < 400){
    const kg = 70 * g / EARTH.g;
    out.push({n: round2(g), unit: "m/s² at the surface", what: "Gravity", feel: `Someone who weighs 70 kg here would feel like ${num(kg, kg < 10 ? 1 : 0)} kg${g < 3 ? " — light enough to jump over a car" : g < 6 ? " — light enough to leap onto a table" : ""}`});
  }
  if(far && kind !== "sun"){
    const ly = far / LY;
    if(ly >= 0.5){ const left = lightLeft(ly); out.push({n: words(ly), unit: "light-years away", what: "Distance", feel: left || `Light takes ${lightTime(far)} to get here`}); }
    else out.push({n: words(far), unit: "km away" + (live ? " today" : ""), what: "Distance", feel: `Light takes ${lightTime(far)}; Voyager 1's speed would need ${far / 61200 / 24 > 700 ? `${words(far / 61200 / 8766)} years` : `${num(far / 61200 / 24)} days`}`});
  }
  if(period && kind !== "galaxy"){
    const around = parentName ? `around ${parentName}` : "around the Sun";
    out.push(period > 400 ? {n: round2(period / 365.25), unit: "Earth years", what: "One orbit", feel: `Once ${around}${period / 365.25 > 30 ? ` — no one alive has seen it make two` : ""}`}
      : {n: round2(period), unit: "days", what: "One orbit", feel: `Once ${around}${period < 2 ? ` every ${num(period * 24, 1)} hours` : ""}`});
  }
  if(spin && kind !== "galaxy" && kind !== "mission"){
    const h = Math.abs(spin) * 24;
    out.push({n: h < 48 ? round2(h) : round2(Math.abs(spin)), unit: h < 48 ? "hours" : "Earth days", what: "One day", feel: spin < 0 ? "It spins backwards: the Sun rises in the west" : h < 48 ? (h < 20 ? "A day shorter than ours" : "A day not far off ours") : `A day there lasts ${num(Math.abs(spin))} of ours`});
  }
  if(temps.length){
    const mid = temps[Math.floor((temps.length - 1) / 2)], c = mid - 273.15;
    const span = temps.length > 1 && temps.at(-1) - temps[0] > 60 ? `${num(temps[0] - 273.15)} to ${num(temps.at(-1) - 273.15)} °C` : "";
    const feel = mid > 3000 ? `${num(mid / SUN.T, 1)} × the Sun's surface` : c > 1538 ? "Hot enough to melt iron" : c > 327 ? "Hot enough to melt lead"
      : c > 57 ? "Hotter than anywhere on Earth" : c < -89 ? "Colder than anywhere ever measured on Earth" : "Within what Earth has known";
    out.push({n: mid > 3000 ? words(mid) : num(c), unit: mid > 3000 ? "K" : "°C", what: "Temperature", feel: span && mid < 3000 ? `${feel} — from ${span}` : feel});
  }
  if(L && L > 0.01 * SUN.L) out.push({n: words(L / SUN.L), unit: "× the Sun's light", what: "Brightness", feel: L > 2 * SUN.L ? `Shines like ${words(L / SUN.L)} Suns` : "A Sun-like glow"});
  if(age) out.push({n: words(age), unit: "years old", what: "Age", feel: age > 4.6e9 ? "Older than the Sun and Earth" : age > 1e9 ? "Younger than the Sun" : age > 1e6 ? "Young, as stars go" : "Newborn, as these things go"});
  const moons = claimIds(e, "P398").length;
  if(moons >= 2 && kind === "planet") out.push({n: num(moons), unit: "known moons", what: "Moons", feel: moons > 50 ? "A crowd of mostly tiny, captured rocks" : "Each with a page here"});
  if(mag !== null && kind !== "sun" && kind !== "planet" && kind !== "moon") out.push({n: (mag > 0 ? "+" : "") + num(mag, 1), unit: "magnitude", what: "How bright",
    feel: mag < 1 ? "Among the brightest things in the night sky" : mag < 6 ? "Visible to the naked eye from a dark place" : mag < 9 ? "A job for binoculars" : "A job for a telescope"});
  return out;
}
const numbersHtml = list => `<div class="ob-nums">${list.map(x => `<div class="ob-num"><p class="ob-what">${esc(x.what)}</p>
  <p class="ob-n">${esc(x.n)} <span>${esc(x.unit)}</span></p>${x.feel ? `<p class="ob-feel">${esc(x.feel)}</p>` : ""}</div>`).join("")}</div>`;
/* side by side with Earth (or the Sun), to scale, when the two can share a picture */
function scaleDraw(name, r, img){
  if(!r) return "";
  const vsSun = r > 3 * EARTH.r * 30, ref = vsSun ? {n: "The Sun", r: SUN.r} : {n: "Earth", r: EARTH.r};
  const k = r / ref.r; if(k > 60 || k < 1 / 60 || (k > 0.85 && k < 1.18)) return "";
  const H = 180, big = Math.max(r, ref.r), s = (H / 2 - 4) / big, ra = Math.max(1.5, r * s), rb = Math.max(1.5, ref.r * s);
  const w = 2 * ra + 2 * rb + 60;
  const disc = (cx, rr, cls, src, id) => src ? `<clipPath id="${id}"><circle cx="${cx}" cy="${H / 2}" r="${rr}"/></clipPath><image href="${esc(src)}" x="${cx - rr}" y="${H / 2 - rr}" width="${2 * rr}" height="${2 * rr}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/><circle cx="${cx}" cy="${H / 2}" r="${rr}" class="ob-ring"/>`
    : `<circle cx="${cx}" cy="${H / 2}" r="${rr}" class="${cls}"/>`;
  return `<figure class="ob-scale"><svg viewBox="0 0 ${w} ${H + 28}" role="img" aria-label="${esc(`${name} beside ${ref.n}, to scale`)}">
    ${disc(ra + 10, ra, "ob-disc this", img, "obsA")}${disc(2 * ra + 50 + rb, rb, vsSun ? "ob-disc sun" : "ob-disc earth", "", "obsB")}
    <text x="${ra + 10}" y="${H + 22}">${esc(name)}</text><text x="${2 * ra + 50 + rb}" y="${H + 22}">${esc(ref.n)}</text></svg></figure>`;
}

/* ---------- small pieces of page ---------- */
const section = (id, label, sub = "") => `<section class="section" id="${id}" hidden><h2 class="label">${esc(label)}</h2>${sub ? `<p class="sub">${sub}</p>` : ""}<div class="body"></div></section>`;
const show = (id, html) => { const s = $(id); if(!s || !html) return; s.querySelector(".body").innerHTML = html; s.hidden = false; };
/* a card with a picture: a planet, a mission patch, a person. Without a picture it isn't shown at all. */
const card = (x, note = "") => {
  const src = x.src || (x.patch ? commons(x.patch, 300) : x.pic ? commons(x.pic, 300) : picCache[x.title]?.src);
  if(!src) return "";
  const href = x.title ? here(x.title) : "https://www.wikidata.org/wiki/" + x.id;
  return `<a class="poster ob-card${x.patch ? " patch" : ""}" href="${esc(href)}"${x.title ? "" : ` ${ext}`}><div class="frame"><img src="${esc(src)}" alt="" loading="lazy" data-t="${esc(x.name)}"></div>
    <div class="cap"><span class="t">${esc(x.name)}</span>${note || x.note ? `<span class="y">${esc(note || x.note)}</span>` : ""}</div></a>`;
};
const strip = (list, note) => {
  const seen = new Set(), src = x => x.src || x.patch || x.pic || picCache[x.title]?.src || "";
  list = list.filter(x => !src(x) || (!seen.has(src(x)) && seen.add(src(x))));
  const html = list.map(x => card(x, typeof note === "function" ? note(x) : note)).join(""); return html ? `<div class="wall strip ob-strip">${html}</div>` : ""; };
/* the "show all" switch under a long list: the best-known ~40, the rest on request */
function capped(host, items, render, {n = 40, what = "", tile = 0} = {}){
  let all = false;
  const cols = tile ? Math.max(1, Math.floor((host.clientWidth + 6) / (tile + 6))) : innerWidth <= 420 ? 3 : 4;
  if(tile || host.querySelector(".fg-tiles") || /fg-tiles/.test(render([]))) n = cols * Math.max(1, Math.round(n / cols));
  const draw = () => {
    const list = all ? items : items.slice(0, n);
    host.innerHTML = render(list, all) + (items.length > n ? `<p class="wall-more ob-more"><button type="button" class="linkish" data-all>${all
      ? "Show only the best known" : `Show all ${items.length}${what ? " " + what : ""}`}</button></p>` : "");
  };
  host.onclick = e => { if(e.target.closest("[data-all]")){ all = !all; draw(); if(!all) host.scrollIntoView({block: "nearest"}); } };
  draw();
}

/* the missions' timeline: patches in order along a rule, year above each */
function timeline(list, verb){
  /* a patch shared by several (a programme's own emblem) says nothing about each one: use its picture instead */
  const uses = {}; list.forEach(m => { if(m.patch) uses[m.patch] = (uses[m.patch] || 0) + 1; });
  list = list.map(m => m.patch && uses[m.patch] > 1 && m.pic ? {...m, patch: ""} : m);
  const items = list.map(m => {
    const src = m.patch ? commons(m.patch, 240) : m.pic ? commons(m.pic, 240) : "";
    return `<li class="ob-tl-item${m.future ? " future" : ""}"><span class="ob-tl-year">${m.year || ""}</span><i class="ob-tl-dot" aria-hidden="true"></i>
      <a class="ob-tl-pic${m.patch ? " patch" : ""}" href="${esc(m.title ? here(m.title) : "https://www.wikidata.org/wiki/" + m.id)}">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<span>${esc(m.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span>`}</a>
      <a class="ob-tl-name" href="${esc(m.title ? here(m.title) : "https://www.wikidata.org/wiki/" + m.id)}">${esc(bare(m.name))}</a>
      <span class="ob-tl-how">${esc(verb(m))}</span></li>`;
  }).join("");
  return `<ol class="ob-tl">${items}</ol>`;
}

/* recognition: awards, the big ones first */
const honors = (e, info) => {
  const list = live(e, "P166").map(c => ({id: c.mainsnak.datavalue.value.id, year: +(c.qualifiers?.P585?.[0]?.datavalue?.value?.time || "").slice(1, 5) || 0}))
    .filter(a => info[a.id]?.name).sort((a, b) => (a.year || 9999) - (b.year || 9999));
  if(!list.length) return "";
  return `<div class="honors"><b>Recognition</b><p class="h-list">${list.slice(0, 4).map(a => `<span>${esc(info[a.id].name)}${a.year ? ` <i>${a.year}</i>` : ""}</span>`).join("")}${
    list.length > 4 ? `<span class="more-h">and ${list.length - 4} more</span>` : ""}</p></div>`;
};

/* ---------- the page ---------- */
const TOPIC = $("otopic");
function shell(){
  TOPIC.innerHTML = `<div class="hero">
      <article class="lead" id="lead"><p class="status">Looking it up…</p></article>
      <aside class="side"><figure class="plate" id="plate" hidden><img class="pic" id="pic" alt=""></figure>
        <div class="facts" id="facts" hidden><h2 class="label">Quick facts</h2><dl id="factlist"></dl></div></aside></div>
    <div id="views"></div><div id="oshelves"></div>`;
}
const alive = ctx => ctx.my === token;
const setFacts = rows => {
  rows = rows.filter(r => r[1]); if(!rows.length) return;
  $("factlist").innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join(""); $("facts").hidden = false;
};
const linkTo = (x, fallback) => x ? (x.title ? `<a href="${esc(here(x.title))}">${esc(x.name || bare(x.title))}</a>` : esc(x.name)) : esc(fallback || "");
const links = (ids, info, n = 3) => ids.slice(0, n).map(i => info[i]?.name ? linkTo(info[i]) : "").filter(Boolean).join(", ");

async function openTopic(title, others = [], query = ""){
  const my = ++token;
  document.body.classList.add("on"); window.scrollTo(0, 0);
  $("q").value = query || title;
  shell();
  let s;
  try { s = await summary(title); } catch(e){ if(my === token) $("lead").innerHTML = `<p class="status">Couldn't load that. Try again in a moment, or try another search.</p>`; return; }
  if(my !== token) return;
  const name = s.title || title;
  document.title = bare(name) + " — Observatory — Myriad";
  const disamb = s.type === "disambiguation";
  const otherLinks = others.filter(o => o !== title && o !== name).slice(0, 5);
  $("lead").innerHTML = `<h1>${esc(bare(name))}</h1>
    ${s.description ? `<p class="desc">${esc(cap(s.description))}</p>` : ""}
    <p class="extract">${esc(disamb ? "This name can mean several things. Try a more exact search." : s.extract)}</p>
    <p class="readon"><b>Read more</b><span id="readon"><a href="${esc(s.content_urls?.desktop?.page)}" ${ext}>Wikipedia</a></span></p>
    ${otherLinks.length ? `<p class="others">Did you mean: ${otherLinks.map(o => `<a href="${here(o)}">${esc(o)}</a>`).join(" · ")}</p>` : ""}`;
  const thumb = s.thumbnail?.source, orig = s.originalimage;
  const img = thumb && orig?.width > 960 && /\/\d+px-/.test(thumb) ? thumb.replace(/\/\d+px-/, "/960px-") : orig?.source || thumb;
  if(img){ $("pic").src = img; $("plate").hidden = false; }
  if(!disamb) Myriad.shelves?.render($("oshelves"), {title: name, description: s.description, short: bare(name)});
  if(!s.wikibase_item || disamb) return;
  let e;
  try { e = await entity(s.wikibase_item); } catch(err){ return; }
  if(my !== token) return;
  const ctx = {my, id: s.wikibase_item, name, short: bare(name), e, img: thumb || "", desc: s.description || ""};
  const kind = isHuman(e) ? "person" : isMission(e) ? "mission" : isObject(e) ? "object" : "other";
  Myriad.discover?.trail.add({wing: "observatory", title: name, name: ctx.short, img: thumb || ""});
  if(kind === "mission" || kind === "object") $("readon").insertAdjacentHTML("beforeend",
    `<a class="drift-here" href="./?drift=${s.wikibase_item}&k=${kind}&name=${encodeURIComponent(name)}">Drift from here</a>`);
  /* the NASA pictures: some beside the words, the rest on the wall further down */
  ctx.nasa = kind === "person" ? Promise.resolve([]) : nasaImages(ctx.short).catch(() => []);
  if(kind === "person") return personPage(ctx);
  if(kind === "mission") return missionPage(ctx);
  return objectPage(ctx, kind === "object");
}

/* the wall of NASA pictures, leaving out the ones already beside the summary */
let sideShown = new Set();
document.addEventListener("myriad-sidefill", ev => { sideShown = new Set(ev.detail); document.dispatchEvent(new Event("ob-redraw")); });
function nasaWall(ctx){
  ctx.nasa.then(list => {
    if(!alive(ctx) || list.length < 4) return;
    Myriad.sideFill?.(list.slice(0, 12).map(x => ({src: x.src, href: x.u, title: x.t})));
    const draw = () => {
      const rest = list.filter(x => !sideShown.has(x.u));
      if(rest.length < 4) return;
      $("s-nasa").hidden = false;
      capped($("s-nasa").querySelector(".body"), rest, l => `<div class="fg-tiles ob-tiles">${l.map(x => `<a class="fg-tile" href="${esc(x.u)}" ${ext} data-name="${esc(x.t)}" title="${esc(x.t + (x.year ? " · " + x.year : ""))}"><img src="${esc(x.src)}" alt="${esc(x.t)}" loading="lazy"></a>`).join("")}</div>`,
        {n: 40, what: "pictures", tile: innerWidth <= 760 ? 0 : 128});
    };
    const redraw = () => { if(alive(ctx)) draw(); else document.removeEventListener("ob-redraw", redraw); };
    document.addEventListener("ob-redraw", redraw);
    draw();
  });
}

/* ---------- tonight: is it up, from where the visitor is (only if they let the page know) ---------- */
const PLANET_IDS = {Q308: "mercury", Q313: "venus", Q111: "mars", Q319: "jupiter", Q193: "saturn", Q324: "uranus", Q332: "neptune", Q405: "moon"};
const hhmm = t => new Date(t).toLocaleTimeString([], {hour: "numeric", minute: "2-digit"});
function skyThing(ctx){
  const {id, e} = ctx;
  if(PLANET_IDS[id]) return PLANET_IDS[id];
  const ra = amount(e, "P6257"), dec = amount(e, "P6258");
  return ra !== null && dec !== null ? {ra, dec} : null;
}
async function tonight(ctx){
  const thing = skyThing(ctx); if(!thing || !navigator.geolocation) return;
  let state = "prompt";
  try { state = (await navigator.permissions.query({name: "geolocation"})).state; } catch(err){}
  if(!alive(ctx) || state === "denied") return;
  const mag = typeof thing === "string" ? (thing === "moon" ? -12 : Sky.planet(thing, Date.now()).mag) : amount(ctx.e, "P1215");
  const run = () => navigator.geolocation.getCurrentPosition(pos => {
    if(!alive(ctx)) return;
    const {latitude: lat, longitude: lng} = pos.coords;
    const res = Sky.tonight(lat, lng, [thing]);
    if(!res.dark){ show("s-tonight", `<p class="ob-tn-line">No real darkness where you are tonight — the Sun stays too close to the horizon.</p>`); return; }
    const p = res.things[0], from = res.dark.from - 2 * 3600e3, to = res.dark.to + 2 * 3600e3;
    const curve = Sky.arc(thing, lat, lng, from, to, 96);
    const eye = mag === null ? "" : mag < 5.5 ? "You'll see it with your own eyes." : mag < 8.5 ? "Binoculars will show it from a dark place." : "You'll need a telescope.";
    const line = p.up
      ? `<b>Yes.</b> Highest around ${hhmm(p.best.t)}, ${Math.round(p.best.alt)}° up in the ${Sky.compass(p.best.az)}. Up from ${p.up.from <= res.dark.from ? "dark" : hhmm(p.up.from)} until ${p.up.to >= res.dark.to ? "dawn" : hhmm(p.up.to)}. ${eye}`
      : p.best.alt > 0 ? `<b>Barely.</b> It only gets ${Math.round(p.best.alt)}° above the ${Sky.compass(p.best.az)}ern horizon after dark — too low to see well.`
      : `<b>Not tonight.</b> It stays below your horizon while it's dark.`;
    const extra = thing === "moon" ? (() => { const m = Sky.moon(Date.now()); return ` ${Sky.phaseName(m.phase)}, ${Math.round(m.fraction * 100)}% lit.`; })() : "";
    show("s-tonight", `<div class="ob-tn">${altChart(curve, res.dark, p)}<p class="ob-tn-line">${line}${esc(extra)}</p></div>`);
    $("s-tonight").querySelector(".sub").textContent = "From where you are — your location stays in this browser";
  }, () => { if($("s-tonight")) $("s-tonight").hidden = true; }, {maximumAge: 600000, timeout: 15000});
  if(state === "granted") return run();
  show("s-tonight", `<p class="fg-ask"><button type="button" class="ghost" id="ob-locate">Is it up tonight where I am?</button></p>`);
  $("ob-locate").onclick = () => { $("ob-locate").disabled = true; $("ob-locate").textContent = "Finding you…"; run(); };
}
/* the night as a picture: the sky's darkness behind, the object's path across it, the horizon */
function altChart(pts, dark, p){
  const W = 720, H = 200, t0 = pts[0].t, t1 = pts.at(-1).t, x = t => (t - t0) / (t1 - t0) * W, y = a => H / 2 - a / 90 * (H / 2 - 12);
  const path = pts.map((q, k) => `${k ? "L" : "M"}${x(q.t).toFixed(1)},${y(q.alt).toFixed(1)}`).join("");
  const every = innerWidth <= 760 ? 4 : 2, hours = []; for(let t = Math.ceil(t0 / (36e5 * every)) * 36e5 * every; t <= t1; t += 36e5 * every) hours.push(t);
  return `<svg class="ob-tn-chart" viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="Its height above the horizon through tonight">
    <rect x="${x(dark.from)}" y="0" width="${x(dark.to) - x(dark.from)}" height="${H}" class="night"/>
    <line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" class="hz"/><line x1="0" x2="${W}" y1="${y(10)}" y2="${y(10)}" class="hz10"/>
    <path d="${path}" class="track"/>${p.best.alt > 0 ? `<circle cx="${x(p.best.t)}" cy="${y(p.best.alt)}" r="6" class="best"/>` : ""}
    ${hours.map(t => `<text x="${x(t)}" y="${H + 16}">${esc(hhmm(t))}</text>`).join("")}
    <text x="6" y="${y(0) - 6}" class="lbl">horizon</text></svg>`;
}

/* ---------- a planet, moon, star, galaxy, nebula… ---------- */
async function objectPage(ctx, astro){
  const {e, id, name, short} = ctx;
  $("views").innerHTML = section("s-tonight", "Tonight", "Whether it's in your sky tonight")
    + section("s-nums", "By the numbers")
    + section("s-missions", "Missions", "Every spacecraft sent there, in order")
    + section("s-ba", "Before & after")
    + section("s-also", "Also")
    + section("s-found", "What's in it")
    + section("s-nasa", "Pictures", "From the NASA Image and Video Library");
  nasaWall(ctx);
  if(astro) tonight(ctx);
  const parent = claimIds(e, "P397")[0], con = claimIds(e, "P59")[0], cls = claimIds(e, "P31").slice(0, 3);
  const disc = claimIds(e, "P61"), mag0 = amount(e, "P1215");
  /* a modern "discovery" date for something anyone can see by eye, with no discoverer named, is a slip in the data
     (Wikidata once had the Andromeda Galaxy found in 1964 rather than 964) */
  const discWhen = !disc.length && mag0 !== null && mag0 < 6 ? null : claimTime(e, "P575");
  const info = await describe([parent, con, ...cls, ...disc.slice(0, 3), ...claimIds(e, "P138").slice(0, 2), ...live(e, "P166").map(c => c.mainsnak.datavalue.value.id).slice(0, 20)].filter(Boolean)).catch(() => ({}));
  if(!alive(ctx)) return;
  const what = cls.map(c => info[c]?.name || "").join(" ").toLowerCase();
  const sub = id === "Q525" ? "sun" : /galax/.test(what) ? "galaxy" : PLANET_IDS[id] && id !== "Q405" ? "planet" : /moon|satellite/.test(what) || id === "Q405" ? "moon"
    : /planet/.test(what) ? "planet" : /nebula/.test(what) ? "nebula" : /star|dwarf|giant/.test(what) ? "star" : /constellation/.test(what) ? "constellation" : "object";
  const parentName = parent && info[parent]?.name && parent !== "Q525" ? info[parent].name : "";
  $("readon")?.closest(".readon")?.insertAdjacentHTML("beforebegin", honors(e, info));

  /* the numbers, with today's distance worked out live for the Sun, Moon and planets */
  const liveKm = PLANET_IDS[id] ? Sky.distanceKm(PLANET_IDS[id]) : id === "Q525" ? Sky.distanceKm("sun") : null;
  const tiles = numbers(e, {kind: sub, live: liveKm, parentName});
  const r = quantity(e, "P2120", "km") ?? (quantity(e, "P2386", "km") ? quantity(e, "P2386", "km") / 2 : null);
  if(tiles.length) show("s-nums", (sub !== "galaxy" && sub !== "nebula" ? scaleDraw(short, r, ctx.img) : "") + numbersHtml(tiles));
  const facts = [["Type", esc(cap(cls.map(c => info[c]?.name).filter(Boolean).slice(0, 2).join(", ")))],
    ["Orbits", parent ? linkTo(info[parent]) : ""], ["Constellation", con ? linkTo(info[con]) : ""],
    ["Discovered", esc([showTime(discWhen), disc.length ? "by " + disc.slice(0, 2).map(d => info[d]?.name).filter(Boolean).join(" and ") : ""].filter(Boolean).join(" "))],
    ["Named after", links(claimIds(e, "P138"), info, 2)]];
  setFacts(facts);

  /* missions that went there */
  const visits = visitors(id).then(rows => visitRows(rows)).catch(() => []);
  visits.then(list => {
    if(!alive(ctx) || !list.length) return;
    const ranked = list.length > 48 ? list.slice().sort((a, b) => b.pop - a.pop).slice(0, 40).sort((a, b) => a.year - b.year) : list;
    $("s-missions").hidden = false;
    let all = false;
    const draw = () => {
      const l = all ? list : ranked;
      $("s-missions").querySelector(".body").innerHTML = timeline(l, m => m.future ? "Planned" : HOW[m.how])
        + (ranked.length < list.length ? `<p class="wall-more ob-more"><button type="button" class="linkish" data-all>${all ? "Show only the best known" : `These are the ${ranked.length} best known — show all ${list.length}`}</button></p>` : "");
    };
    $("s-missions").onclick = ev => { if(ev.target.closest("[data-all]")){ all = !all; draw(); } };
    draw();
  });

  /* before & after: who found it and when → it → the first spacecraft to reach it, and the latest */
  visits.then(async list => {
    if(!alive(ctx)) return;
    const before = disc.map(d => info[d]).filter(x => x?.name).slice(0, 3).map(x => ({...x, how: discWhen ? `Found it, ${discWhen.y}` : "Found it"}));
    const went = list.filter(m => !m.future && m.year && m.year <= new Date().getFullYear());
    const after = [went[0], went.at(-1)].filter((m, k, a) => m && a.indexOf(m) === k).map((m, k) => ({...m, how: k ? `Latest there, ${m.year}` : `First there, ${m.year}`}));
    const ancient = !before.length && !discWhen && ["planet", "moon", "sun"].includes(sub) && ["Q308", "Q313", "Q111", "Q319", "Q193", "Q405", "Q525"].includes(id);
    if(!before.length && !after.length && !discWhen) return;
    await pics([name, ...before.map(x => x.title)].filter(Boolean));
    if(!alive(ctx)) return;
    show("s-ba", beforeAfter(ctx, before.length ? before : ancient ? [{name: "Known since antiquity", how: "Seen by the first people to look up", text: true}]
      : discWhen ? [{name: `Discovered ${showTime(discWhen)}`, how: "", text: true}] : [], after, "Discovered", "Reached"));
  });

  /* also: the same parent body, constellation, or year of discovery */
  const also = parent && parent !== "Q525" ? [`Also around ${info[parent]?.name || "it"}`, `?x wdt:P397 wd:${parent} . MINUS { ?x wdt:P619 [] }`]
    : parent === "Q525" && sub === "planet" ? ["Also around the Sun", `VALUES ?x { wd:Q308 wd:Q313 wd:Q2 wd:Q111 wd:Q319 wd:Q193 wd:Q324 wd:Q332 wd:Q339 wd:Q596 wd:Q1885 }`]
    : con && sub !== "constellation" ? [`Also in ${info[con]?.name || "the same constellation"}`, `?x wdt:P59 wd:${con} .`]
    : discWhen ? [`Also discovered in ${discWhen.y}`, yearSpan("P575", discWhen.y)] : null;
  if(also) neighbours(also[1], id).then(async rows => {
    const list = rows.map(r => ({id: qid(r.x), name: label(r, "x") || artTitle(r.a), title: artTitle(r.a), pic: r.pic, pop: +r.pop})).filter(x => x.name);
    await pics(list.filter(x => !x.pic).map(x => x.title));
    if(!alive(ctx)) return;
    const html = strip(list.slice(0, 18));
    if(html && list.filter(x => x.pic || picCache[x.title]?.src).length >= 3){ $("s-also").querySelector("h2").textContent = also[0]; show("s-also", html); }
  }).catch(() => {});
  /* a constellation: what's in it */
  if(sub === "constellation") neighbours(`?x wdt:P59 wd:${id} .`, id).then(async rows => {
    const list = rows.map(r => ({id: qid(r.x), name: label(r, "x") || artTitle(r.a), title: artTitle(r.a), pic: r.pic})).filter(x => x.name);
    await pics(list.filter(x => !x.pic).map(x => x.title));
    if(alive(ctx)) show("s-found", strip(list));
  }).catch(() => {});
}

/* the before & after strip: what came before → this → what it led to */
function beforeAfter(ctx, before, after, beforeLabel, afterLabel){
  const one = x => x.text ? `<div class="ba-item ob-ba-text"><p>${esc(x.name)}</p>${x.how ? `<span class="ba-how">${esc(x.how)}</span>` : ""}</div>`
    : `<div class="ba-item">${card(x) || `<a class="poster ob-card" href="${esc(x.title ? here(x.title) : "#")}"><div class="frame"><span class="cover">${esc(x.name)}</span></div><div class="cap"><span class="t">${esc(x.name)}</span></div></a>`}<span class="ba-how">${esc(x.how || "")}</span></div>`;
  const col = (lbl, list) => list.length ? `<div class="ba-col"><h3 class="minor">${esc(lbl)}</h3><div class="ba-list">${list.map(one).join("")}</div></div>` : `<div class="ba-col"></div>`;
  const me = picCache[ctx.name]?.src || ctx.img;
  return `<div class="before-after">${col(beforeLabel, before)}
    <div class="ba-this">${before.length ? `<span class="ba-arrow" aria-hidden="true">→</span>` : ""}${me ? `<a class="poster ob-card" href="${esc(here(ctx.name))}"><div class="frame"><img src="${esc(me)}" alt=""></div><div class="cap"><span class="t">${esc(ctx.short)}</span></div></a>` : ""}${after.length ? `<span class="ba-arrow" aria-hidden="true">→</span>` : ""}</div>
    ${col(afterLabel, after)}</div>`;
}

/* ---------- a mission or spacecraft ---------- */
async function missionPage(ctx){
  const {e, id, name, short} = ctx;
  $("views").innerHTML = section("s-nums", "By the numbers")
    + section("s-went", "Where it went", "Each place it reached, in order")
    + section("s-found", "What it found")
    + section("s-crew", "Crew")
    + section("s-ba", "Before & after", "What came before it, and what it led to")
    + section("s-also", "Also")
    + section("s-nasa", "Pictures", "From the NASA Image and Video Library");
  nasaWall(ctx);
  const prev = claimIds(e, "P155"), next = claimIds(e, "P156"), prog = claimIds(e, "P361")[0], crew = claimIds(e, "P1029");
  const ids = [...prev, ...next, prog, ...crew, ...claimIds(e, "P137").slice(0, 2), ...claimIds(e, "P176").slice(0, 2), ...claimIds(e, "P375").slice(0, 1),
    ...claimIds(e, "P31").slice(0, 2), ...live(e, "P166").map(c => c.mainsnak.datavalue.value.id).slice(0, 20)].filter(Boolean);
  const info = await describe(ids).catch(() => ({}));
  if(!alive(ctx)) return;
  $("readon")?.closest(".readon")?.insertAdjacentHTML("beforebegin", honors(e, info));
  /* the patch beside the title, when the article's picture isn't one */
  const patch = claimStr(e, "P154");
  if(patch && $("plate").hidden){ $("pic").src = commons(filePath(patch), 600); $("plate").hidden = false; $("plate").classList.add("ob-patch-plate"); }
  const launched = claimTime(e, "P619");
  setFacts([["Type", esc(cap(claimIds(e, "P31").map(c => info[c]?.name).filter(Boolean).slice(0, 2).join(", ")))], ["Launched", esc(showTime(launched))],
    ["Rocket", links(claimIds(e, "P375"), info, 1)], ["Operator", links(claimIds(e, "P137"), info, 2)], ["Built by", links(claimIds(e, "P176"), info, 2)],
    ["Programme", prog ? linkTo(info[prog]) : ""], ["Ended", esc(showTime(claimTime(e, "P582") || claimTime(e, "P730")))]]);
  const tiles = numbers(e, {kind: "mission"});
  if(tiles.length) show("s-nums", numbersHtml(tiles));

  const people = crew.map(i => info[i]).filter(p => p?.name);
  if(people.length) show("s-crew", `<div class="faces">${people.map(p => `<a class="face" href="${esc(p.title ? here(p.title) : "https://www.wikidata.org/wiki/" + p.id)}"${p.title ? "" : ` ${ext}`}><div class="ph">${p.pic
    ? `<img src="${esc(commons(p.pic, 240))}" alt="" loading="lazy">` : `<span class="initials">${esc(p.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span>`}</div><div class="cap"><span class="t">${esc(p.name)}</span></div></a>`).join("")}</div>`);

  destinations(id).then(rows => {
    const list = rows.map(r => ({id: qid(r.t), name: label(r, "t") || artTitle(r.a), title: artTitle(r.a), pic: r.pic, how: howOf(r.how),
      year: r.when ? +r.when.slice(0, 4) : 0, pop: +r.pop})).filter(x => x.name && !["Q2", "Q1491"].includes(x.id));
    if(!alive(ctx) || !list.length) return;
    const dated = list.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    show("s-went", timeline(dated.map(x => ({...x, patch: "", pic: x.pic})), x => ({flyby: "Flew past", orbit: "Orbited", land: "Landed", to: "Destination", visit: "Reached"})[x.how]));
  }).catch(() => {});

  /* what it found: moons, rings, asteroids — named for it in Wikidata's "discoverer" */
  discoveries(id).then(async rows => {
    const list = rows.map(r => ({id: qid(r.x), name: label(r, "x") || artTitle(r.a), title: artTitle(r.a), pic: r.pic, year: r.when ? +r.when.slice(0, 4) : 0, pop: +r.pop})).filter(x => x.name);
    if(!list.length) return;
    await pics(list.slice(0, 40).filter(x => !x.pic).map(x => x.title));
    if(!alive(ctx)) return;
    const withPic = list.filter(x => x.pic || picCache[x.title]?.src);
    if(!withPic.length) return;
    $("s-found").hidden = false;
    capped($("s-found").querySelector(".body"), withPic, l => `<div class="wall ob-wall">${l.map(x => card(x, x.year ? `Found ${x.year}` : "")).join("")}</div>`, {n: 40, what: "finds"});
  }).catch(() => {});

  /* before & after: what it followed, and what followed it */
  const progList = prog ? programme(prog).catch(() => []) : Promise.resolve([]);
  progList.then(async rows => {
    if(!alive(ctx)) return;
    const prog_ = rows.map(r => ({id: qid(r.m), name: label(r, "m") || artTitle(r.a), title: artTitle(r.a), patch: r.patch, pic: r.pic, year: +String(r.launch).slice(0, 4)}));
    const at = prog_.findIndex(x => x.id === id);
    let before = prev.map(i => info[i]).filter(x => x?.name), after = next.map(i => info[i]).filter(x => x?.name);
    const year = id => prog_.find(x => x.id === id)?.year;
    if(launched && before.some(b => after.some(a => a.id === b.id))){
      before = before.filter(b => !(year(b.id) > launched.y) && !after.some(a => a.id === b.id && year(b.id) >= launched.y));
      after = after.filter(a => !before.some(b => b.id === a.id));
    }
    if(!before.length && at > 0 && !after.some(x => x.id === prog_[at - 1].id)) before = [prog_[at - 1]];
    if(!after.length && at >= 0 && at < prog_.length - 1 && !before.some(x => x.id === prog_[at + 1].id)) after = [prog_[at + 1]];
    if(!before.length && !after.length) return;
    await pics([name, ...before, ...after].map(x => x.title || x).filter(Boolean));
    if(!alive(ctx)) return;
    show("s-ba", beforeAfter(ctx, before.map(x => ({...x, how: "Came before"})), after.map(x => ({...x, how: "Came next"})), "Came from", "Led to"));
    /* also: the rest of its programme, or else the year's other launches */
    const others = prog_.filter(x => x.id !== id);
    if(others.length >= 3){
      $("s-also").querySelector("h2").textContent = `Also in ${info[prog]?.name || "the programme"}`;
      $("s-also").hidden = false;
      capped($("s-also").querySelector(".body"), others, l => timeline(l, () => ""), {n: 40, what: "missions"});
      return;
    }
    if(launched) neighbours(yearSpan("P619", launched.y), id).then(async rows => {
      const list = rows.map(r => ({id: qid(r.x), name: label(r, "x") || artTitle(r.a), title: artTitle(r.a), pic: r.pic, patch: r.patch})).filter(x => x.name);
      await pics(list.filter(x => !x.pic && !x.patch).map(x => x.title));
      if(!alive(ctx)) return;
      const html = strip(list.slice(0, 18));
      if(html){ $("s-also").querySelector("h2").textContent = `Also launched in ${launched.y}`; show("s-also", html); }
    }).catch(() => {});
  });
}

/* ---------- a person: an astronomer, an astronaut ---------- */
async function personPage(ctx){
  const {e, id, name} = ctx;
  $("views").innerHTML = section("s-found", "Discoveries") + section("s-missions", "Flew on") + section("s-ba", "Before & after", "Who taught them, and whom they taught")
    + section("s-also", "Also");
  const adv = claimIds(e, "P184"), stu = claimIds(e, "P185"), inf = claimIds(e, "P737");
  const info = await describe([...adv, ...stu.slice(0, 6), ...inf.slice(0, 3), ...claimIds(e, "P19"), ...live(e, "P166").map(c => c.mainsnak.datavalue.value.id).slice(0, 20)]).catch(() => ({}));
  if(!alive(ctx)) return;
  $("readon")?.closest(".readon")?.insertAdjacentHTML("beforebegin", honors(e, info));
  const born = claimTime(e, "P569");
  setFacts([["Born", esc([showTime(born), claimIds(e, "P19").map(i => info[i]?.name).filter(Boolean)[0]].filter(Boolean).join(", "))], ["Died", esc(showTime(claimTime(e, "P570")))]]);
  discoveries(id).then(async rows => {
    const list = rows.map(r => ({id: qid(r.x), name: label(r, "x") || artTitle(r.a), title: artTitle(r.a), pic: r.pic, year: r.when ? +r.when.slice(0, 4) : 0})).filter(x => x.name);
    await pics(list.slice(0, 40).filter(x => !x.pic).map(x => x.title));
    const withPic = list.filter(x => x.pic || picCache[x.title]?.src);
    if(!alive(ctx) || !withPic.length) return;
    $("s-found").hidden = false;
    capped($("s-found").querySelector(".body"), withPic, l => `<div class="wall ob-wall">${l.map(x => card(x, x.year ? String(x.year) : "")).join("")}</div>`, {n: 40, what: "discoveries"});
  }).catch(() => {});
  /* missions they flew: Wikidata lists astronauts as each mission's crew */
  sparql(`SELECT ?m ?mLabel (MIN(?l) AS ?launch) (SAMPLE(?logo) AS ?patch) (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) WHERE {
    ?m wdt:P1029 wd:${id} . OPTIONAL { ?m wdt:P619 ?l } OPTIONAL { ?m wdt:P154 ?logo } OPTIONAL { ?m wdt:P18 ?img }
    OPTIONAL { ?art schema:about ?m ; schema:isPartOf <https://en.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } GROUP BY ?m ?mLabel ORDER BY ?launch`).then(rows => {
    const list = rows.map(r => ({id: qid(r.m), name: label(r, "m") || artTitle(r.a), title: artTitle(r.a), patch: r.patch, pic: r.pic, year: r.launch ? +r.launch.slice(0, 4) : 0})).filter(x => x.name);
    if(alive(ctx) && list.length) show("s-missions", timeline(list, x => x.year ? "Launched" : ""));
  }).catch(() => {});
  const before = [...adv, ...inf].map(i => info[i]).filter(p => p?.name).slice(0, 3).map(p => ({...p, how: adv.includes(p.id) ? "Their teacher" : "An influence"}));
  const after = stu.map(i => info[i]).filter(p => p?.name).slice(0, 4).map(p => ({...p, how: "Their student"}));
  if(before.length || after.length){
    await pics([name, ...before, ...after].map(x => x.title || x).filter(Boolean));
    if(alive(ctx)) show("s-ba", beforeAfter(ctx, before, after, "Learned from", "Taught"));
  }
  if(born) neighbours(`?x wdt:P106 ?job . VALUES ?job { wd:Q11063 wd:Q11631 wd:Q169470 } ${yearSpan("P569", born.y)}`, id).then(async rows => {
    const list = rows.map(r => ({id: qid(r.x), name: label(r, "x") || artTitle(r.a), title: artTitle(r.a), pic: r.pic})).filter(x => x.name && x.pic);
    if(alive(ctx) && list.length >= 3){ $("s-also").querySelector("h2").textContent = `Also born in ${born.y}`; show("s-also", `<div class="faces">${list.map(p => `<a class="face" href="${esc(here(p.title))}"><div class="ph"><img src="${esc(commons(p.pic, 240))}" alt="" loading="lazy"></div><div class="cap"><span class="t">${esc(p.name)}</span></div></a>`).join("")}</div>`); }
  }).catch(() => {});
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
function landing(){ token++; Myriad.shelves?.clear(); document.body.classList.remove("on"); $("q").value = ""; document.title = "Observatory — Myriad"; }
window.addEventListener("popstate", ev => {
  if(ev.state?.title) openTopic(ev.state.title, ev.state.others, ev.state.query);
  else { const t = new URLSearchParams(location.search).get("t"); t ? openTopic(t) : landing(); }
});
$("f").addEventListener("submit", ev => { ev.preventDefault(); search($("q").value); });
$("q").addEventListener("search", () => { if(!$("q").value && document.body.classList.contains("on")){ history.pushState(null, "", location.pathname); landing(); } });
/* links to other Observatory topics open in place */
document.addEventListener("click", ev => {
  const a = ev.target.closest("a[href^='./?t=']"); if(!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
  ev.preventDefault(); go(new URL(a.getAttribute("href"), location.href).searchParams.get("t"));
});
/* a picture that fails to load takes its card with it, so nothing shows an empty frame */
document.addEventListener("error", ev => {
  const img = ev.target; if(img.tagName !== "IMG") return;
  if(img.id === "pic") $("plate").hidden = true;
  else if(img.closest(".fg-tile, .side-fill a, .ob-card, .ob-strip .poster")) (img.closest(".fg-tile, .side-fill a, .ob-card, .poster")).remove();
  else if(img.closest(".ob-tl-pic")) img.replaceWith(Object.assign(document.createElement("span"), {textContent: "·"}));
  else if(img.closest(".ph")) img.remove();
  else if(img.closest(".dc-img, .dt-img, .dn-img")) img.outerHTML = `<span class="dc-ini">·</span>`;
}, true);

/* shared with the front page (landing.js) */
window.Obs = {sparql, getJSON, qid, label, artTitle, commons, filePath, here, bare, cap, num, words, pics, picCache, summary, entity, describe, claimIds, claimTime, claimStr,
  numbers, numbersHtml, visitors, visitRows, destinations, discoveries, nasaImages, HOW, howOf, lightTime, dist, LY, AU, go, card, strip, capped, timeline, PLANET_IDS};

const p = new URLSearchParams(location.search);
if(p.get("t")) openTopic(p.get("t"));
else if(p.get("q")) search(p.get("q"));
}
