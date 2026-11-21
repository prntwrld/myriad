/* Myriad — Metronome's front page: a record of the day, a wall of covers, Drift through bandmates, producers, labels and
   similar artists, a year dial, a map of music scenes by city, a concert from the Live Music Archive to lean back to,
   and the visitor's collection. Picks of the day are seeded by the date, so everyone sees the same ones today. */
{
const {esc, WINGS, topicIn} = window.Myriad, D = window.Myriad.discover, M = window.Metro;
const $ = id => document.getElementById(id);
const ext = `target="_blank" rel="noopener"`;
const here = M.here;
const CINEMA = WINGS.find(w => w.id === "cinema");
const ALBUMS = "P31=Q482994|P31=Q208569|P31=Q209939|P31=Q169930";

/* records to start from: well-known, from many places and decades (English Wikipedia titles) */
const CANON = ["Kind of Blue","A Love Supreme","Mingus Ah Um","Time Out (Dave Brubeck Quartet album)","Blue Train (album)","Moanin'","Somethin' Else (Cannonball Adderley album)",
  "Saxophone Colossus","The Shape of Jazz to Come","Getz/Gilberto","Head Hunters","Bitches Brew","Journey in Satchidananda","Lady in Satin","Ella and Louis","Sketches of Spain",
  "Atlantis (Sun Ra album)","Space Is the Place (Sun Ra album)","Lanquidity","Pet Sounds","Revolver (Beatles album)","Abbey Road","The Velvet Underground & Nico","Highway 61 Revisited",
  "Blonde on Blonde","Blood on the Tracks","Astral Weeks","Moondance","Blue (Joni Mitchell album)","Court and Spark","What's Going On (Marvin Gaye album)","Innervisions",
  "Songs in the Key of Life","Talking Book","There's a Riot Goin' On","Maggot Brain","I Never Loved a Man the Way I Love You","At Folsom Prison","Tapestry (Carole King album)",
  "Harvest (Neil Young album)","Pink Moon","Five Leaves Left","Forever Changes","Odessey and Oracle","Bookends (album)","Tea for the Tillerman","Songs of Leonard Cohen",
  "Electric Ladyland","Let It Bleed","Exile on Main St.","Led Zeppelin IV","Paranoid (album)","The Dark Side of the Moon","Wish You Were Here (Pink Floyd album)","Rumours (album)",
  "Aja (album)","Hunky Dory","The Rise and Fall of Ziggy Stardust and the Spiders from Mars","Station to Station","Low (David Bowie album)","Horses (album)","Marquee Moon",
  "Ramones (album)","London Calling","Never Mind the Bollocks, Here's the Sex Pistols","Pink Flag","Unknown Pleasures","Closer (Joy Division album)","Remain in Light","Fear of Music",
  "Another Green World","Music for Airports","Rock Bottom (album)","Tago Mago","Neu! (album)","Autobahn (album)","Trans-Europe Express (album)","Catch a Fire",
  "Exodus (Bob Marley and the Wailers album)","Kaya (album)","Super Ape","Expensive Shit","Zombie (album)","Os Mutantes (album)","Clube da Esquina (album)",
  "Tropicália: ou Panis et Circencis","Construção","Acabou Chorare","Elis & Tom","Graceland (album)","Buena Vista Social Club (album)","Purple Rain (album)","Thriller (album)",
  "Sign o' the Times","The Queen Is Dead","Psychocandy","Disintegration (The Cure album)","Hounds of Love","Heaven or Las Vegas","Treasure (Cocteau Twins album)","Spirit of Eden",
  "Laughing Stock (album)","Daydream Nation","Doolittle (album)","Loveless (album)","Screamadelica","Nevermind","Spiderland","Slanted and Enchanted","Rid of Me","Exile in Guyville",
  "Grace (Jeff Buckley album)","Blue Lines","Dummy (album)","Mezzanine (album)","Maxinquaye","Selected Ambient Works 85–92","Music Has the Right to Children","Endtroducing.....",
  "Homework (Daft Punk album)","Moon Safari","Debut (Björk album)","Homogenic","Vespertine (album)","OK Computer","Kid A","In Rainbows","Ágætis byrjun",
  "Lift Your Skinny Fists Like Antennas to Heaven","F♯ A♯ ∞","Illmatic","The Low End Theory","Midnight Marauders","3 Feet High and Rising",
  "It Takes a Nation of Millions to Hold Us Back","Paul's Boutique","Ready to Die","Enter the Wu-Tang (36 Chambers)","Aquemini","The Miseducation of Lauryn Hill","Madvillainy",
  "Donuts (album)","Voodoo (D'Angelo album)","Baduizm","To Pimp a Butterfly","Channel Orange","Blonde (Frank Ocean album)","My Beautiful Dark Twisted Fantasy",
  "Lemonade (Beyoncé album)","Renaissance (Beyoncé album)","Back to Black","Untrue (album)","Boy in da Corner","Since I Left You","Person Pitch","Merriweather Post Pavilion (album)",
  "Is This It","Funeral (Arcade Fire album)","Sound of Silver","Carrie & Lowell","For Emma, Forever Ago","Ys (album)","Twin Fantasy","Fetch the Bolt Cutters","Punisher (album)",
  "SOS (SZA album)","Motomami","Un Verano Sin Ti","Master of Puppets","Reign in Blood"];

/* music scenes by city: [city, latitude, longitude, [the scenes' English Wikipedia titles]] */
const SCENES = [
  ["Detroit", 42.33, -83.05, ["Motown", "Detroit techno"]], ["Chicago", 41.88, -87.63, ["Chicago blues", "Chicago house", "Chicago soul"]],
  ["New York", 40.71, -74.0, ["Bebop", "Hip-hop", "Salsa music", "No wave"]], ["New Orleans", 29.95, -90.07, ["Dixieland jazz", "New Orleans rhythm and blues", "Bounce music"]],
  ["Memphis", 35.15, -90.05, ["Memphis soul", "Rockabilly"]], ["Nashville", 36.16, -86.78, ["Nashville sound"]], ["Clarksdale", 34.2, -90.57, ["Delta blues"]],
  ["Kansas City", 39.1, -94.58, ["Kansas City jazz"]], ["Los Angeles", 34.05, -118.24, ["West Coast jazz", "G-funk", "Paisley Underground"]],
  ["San Francisco", 37.77, -122.42, ["San Francisco Sound"]], ["Bakersfield", 35.37, -119.02, ["Bakersfield sound"]], ["Seattle", 47.61, -122.33, ["Grunge"]],
  ["Olympia", 47.04, -122.9, ["Riot grrrl"]], ["Washington, D.C.", 38.9, -77.04, ["Go-go", "Washington, D.C. hardcore"]], ["Minneapolis", 44.98, -93.27, ["Minneapolis sound"]],
  ["Philadelphia", 39.95, -75.17, ["Philadelphia soul"]], ["Atlanta", 33.75, -84.39, ["Trap music", "Crunk"]], ["Houston", 29.76, -95.37, ["Chopped and screwed"]],
  ["Kingston", 17.97, -76.79, ["Ska", "Rocksteady", "Reggae", "Dub music"]], ["Havana", 23.11, -82.37, ["Son cubano", "Mambo (music)"]],
  ["Port of Spain", 10.66, -61.51, ["Calypso music", "Soca music"]], ["Barranquilla", 10.96, -74.78, ["Cumbia"]], ["Rio de Janeiro", -22.91, -43.17, ["Bossa nova", "Samba"]],
  ["Salvador", -12.97, -38.5, ["Tropicália"]], ["Buenos Aires", -34.6, -58.38, ["Tango music"]], ["Lagos", 6.52, 3.38, ["Afrobeat", "Jùjú music"]], ["Accra", 5.6, -0.19, ["Highlife"]],
  ["Kinshasa", -4.32, 15.31, ["Congolese rumba", "Soukous"]], ["Addis Ababa", 9.03, 38.74, ["Ethio-jazz"]], ["Johannesburg", -26.2, 28.05, ["Kwaito", "Amapiano"]],
  ["Lisbon", 38.72, -9.14, ["Fado"]], ["Seville", 37.39, -5.98, ["Flamenco"]], ["Paris", 48.86, 2.35, ["Chanson", "Yé-yé", "French house"]],
  ["London", 51.51, -0.13, ["Britpop", "UK garage", "Grime music"]], ["Croydon", 51.37, -0.1, ["Dubstep"]], ["Bristol", 51.45, -2.59, ["Trip hop"]],
  ["Liverpool", 53.41, -2.98, ["Beat music"]], ["Manchester", 53.48, -2.24, ["Madchester"]], ["Birmingham", 52.49, -1.89, ["Heavy metal music"]],
  ["Canterbury", 51.28, 1.08, ["Canterbury scene"]], ["Düsseldorf", 51.23, 6.78, ["Krautrock"]], ["Berlin", 52.52, 13.4, ["Neue Deutsche Welle"]],
  ["Oslo", 59.91, 10.75, ["Early Norwegian black metal scene"]], ["Gothenburg", 57.71, 11.97, ["Melodic death metal"]], ["Athens", 37.98, 23.73, ["Rebetiko"]],
  ["Istanbul", 41.0, 28.98, ["Anatolian rock"]], ["Mumbai", 19.08, 72.88, ["Hindi film music"]], ["Tokyo", 35.68, 139.69, ["City pop", "Shibuya-kei"]],
  ["Hong Kong", 22.32, 114.17, ["Cantopop"]], ["Seoul", 37.57, 126.98, ["K-pop"]], ["Dunedin", -45.87, 170.5, ["Dunedin sound"]]];

const box = document.createElement("div");
box.id = "discover";
box.innerHTML = `
  <section class="cine-hero mt-hero" id="d-hero" hidden></section>
  <section class="section" id="d-wall" hidden><h2 class="label">The wall</h2><p class="sub">A different spread every day — open any one</p><div class="body"></div></section>
  <section class="section" id="d-drift" hidden><h2 class="label">Drift</h2><p class="sub">From a record to the people who made it, the label that put it out, and the artists who sound like them</p><div class="body"></div></section>
  <section class="section" id="d-dial" hidden><h2 class="label">The year dial</h2><p class="sub">Turn it to any year for its best-known records</p><div class="body"></div></section>
  <section class="section" id="d-map" hidden><h2 class="label">Scenes</h2><p class="sub">Where sounds were born — pick a city</p><div class="body"></div></section>
  <section class="section" id="d-live" hidden><h2 class="label">Live, from the Archive</h2><p class="sub">A concert from the Live Music Archive, free to play straight through</p><div class="body"></div></section>
  <section class="section" id="d-trail" hidden><h2 class="label">Your collection</h2><p class="sub"><span id="d-count"></span> — kept only in this browser <button type="button" class="linkish small" id="d-clear">Clear</button></p><div class="body"></div></section>`;
$("main").prepend(box);
$("chips").insertAdjacentHTML("afterbegin", `<button type="button" class="shuffle" id="d-shuffle" title="Open a well-known record at random">Shuffle</button>`);
/* a grid of pictures shows whole rows only, so no lone cover is left on the last line */
const whole = grid => {
  if(!grid?.isConnected) return;
  const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length || 1, kids = [...grid.children];
  const keep = Math.max(cols, Math.floor(kids.length / cols) * cols);
  kids.forEach((k, i) => k.style.display = i < keep ? "" : "none");
};
const wholeRows = [];
addEventListener("resize", () => wholeRows.forEach(whole));
const keepWhole = grid => { wholeRows.push(grid); whole(grid); };
const loaded = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i.naturalWidth > 0); i.onerror = () => ok(false); i.src = src; });
const nameOf = t => M.bare(t);
const byOf = t => (/ by (.+)$/.exec(M.picCache[t]?.desc || "") || [])[1] || "";

/* ---------- the record of the day: one cover, big, against its own colours ---------- */
let heroes = 0;
async function hero(r){
  const sec = $("d-hero");
  for(let tries = 0; tries < 6; tries++){
    const t = CANON[Math.floor(r() * CANON.length)];
    await M.pics([t]);
    const src = M.picOf(t); if(!src) continue;
    const big = M.bigger(src, 500);
    if(!await loaded(big)) continue;
    const desc = M.picCache[t]?.desc || "";
    sec.innerHTML = `<div class="ch-frame"><div class="ch-bg" style="background-image:url('${esc(src)}')"></div>
      <a class="ch-poster mt-cover" href="${esc(here(t))}"><img src="${esc(big)}" alt=""></a>
      <div class="ch-text"><p class="ch-kicker">${heroes ? "Also on the turntable" : "Record of the day"}</p>
        <h2 class="ch-title"><a href="${esc(here(t))}">${esc(nameOf(t))}</a></h2>
        ${desc ? `<p class="ch-desc">${esc(M.cap(desc))}</p>` : ""}
        <p class="ch-ctl"><a class="ch-open" href="${esc(here(t))}">Open the record</a><button type="button" class="ghost" id="ch-next">Something else</button></p></div></div>`;
    sec.hidden = false; heroes++;
    $("ch-next").onclick = () => hero(Math.random);
    return {t, src};
  }
  return null;
}

/* ---------- the wall: a dense spread of covers ---------- */
async function theWall(j){
  const r = D.rng("metronome-wall-" + D.today());
  const pool = [...new Set([...CANON, ...(j ? Object.values(j.years).flat().filter(x => x.pop >= 30).map(x => x.title) : [])])];
  const pick = [];
  while(pick.length < 56 && pool.length) pick.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  await M.pics(pick);
  const shown = pick.filter(t => M.picOf(t)).slice(0, 40);
  if(shown.length < 8) return;
  const sec = $("d-wall");
  sec.querySelector(".body").innerHTML = `<div class="fg-tiles mt-tiles">${shown.map(t => `<a class="fg-tile mt-tile" href="${esc(here(t))}" data-name="${esc(nameOf(t) + (byOf(t) ? " — " + byOf(t) : ""))}"><img src="${esc(M.picOf(t))}" alt="${esc(nameOf(t))}" loading="lazy"></a>`).join("")}</div>`;
  sec.hidden = false;
  keepWhole(sec.querySelector(".mt-tiles"));
}

/* ---------- Drift: record → the people and labels behind it → their other records and the artists they sound like ---------- */
const node = (kind, x) => ({key: x.id, kind, id: x.id, name: M.bare(x.name), title: x.title, href: here(x.title), img: M.picOf(x.title), sub: x.sub || "",
  shape: kind === "artist" ? "round" : "square"});
/* the threads offered first come from different kinds of connection, so three choices say three different things */
function weave(groups){
  const lists = groups.map(g => { const l = g.slice(), out = []; while(l.length){ const c = D.pick(l, x => Math.sqrt(x.pop || 1)); l.splice(l.indexOf(c), 1); out.push(c); } return out; }).filter(l => l.length);
  const out = [];
  while(lists.some(l => l.length)) for(const l of lists) if(l.length) out.push(l.shift());
  return out;
}
/* candidates with their names, articles and pictures; the ones with a picture, if there are enough of them */
async function cands(list){
  const info = await M.wdInfo(list.map(c => c.id));
  let out = list.filter(c => info[c.id]?.title).map(c => ({...c, ...info[c.id], why: c.why}));
  await M.pics(out.map(c => c.title));
  const pictured = out.filter(c => M.picOf(c.title));
  if(pictured.length >= 3) out = pictured;
  return out;
}
const asSteps = list => list.map(c => ({node: node(c.kind, {...c, sub: c.sub || (c.kind === "record" ? String(M.yearIn(M.picCache[c.title]?.desc) || "") : "")}), why: c.why, pop: c.pop}));
async function fromRecord(n){
  const e = (await M.entities([n.id]))[n.id] || {};
  const perf = M.claimIds(e, "P175"), prod = M.claimIds(e, "P162"), lab = M.claimIds(e, "P264");
  const [more, also] = await Promise.all([
    perf[0] ? M.wdFind(`haswbstatement:P175=${perf[0]} haswbstatement:${ALBUMS}`, 30).catch(() => ({ids: []})) : {ids: []},
    lab[0] ? M.wdFind(`haswbstatement:P264=${lab[0]} haswbstatement:${ALBUMS}`, 40).catch(() => ({ids: []})) : {ids: []}]);
  const names = await M.wdInfo([perf[0], lab[0]].filter(Boolean));
  const people = await cands([...perf.map(id => ({id, kind: "artist", why: "by"})), ...prod.filter(i => !perf.includes(i)).map(id => ({id, kind: "artist", why: "produced by"}))]);
  const labels = await cands(lab.map(id => ({id, kind: "label", why: "released on"})));
  const sibs = await cands([...more.ids.filter(i => i !== n.id).map(id => ({id, kind: "record", why: `also by ${M.bare(names[perf[0]]?.name || "them")}`})),
    ...also.ids.filter(i => i !== n.id && !more.ids.includes(i)).map(id => ({id, kind: "record", why: `also on ${M.bare(names[lab[0]]?.name || "the label")}`}))]);
  return asSteps(weave([people, labels, sibs]));
}
async function fromArtist(n){
  const e = (await M.entities([n.id]))[n.id] || {};
  const mbid = M.claimStr(e, "P434");
  /* a film composer's scores open in Cinema */
  const scored = CINEMA ? M.wdFind(`haswbstatement:P86=${n.id} haswbstatement:P31=Q11424`, 1).catch(() => ({total: 0})) : Promise.resolve({total: 0});
  const [recs, produced, members, sim] = await Promise.all([
    M.wdFind(`haswbstatement:P175=${n.id} haswbstatement:${ALBUMS}`, 30).catch(() => ({ids: []})),
    M.wdFind(`haswbstatement:P162=${n.id} -haswbstatement:P175=${n.id} haswbstatement:${ALBUMS}`, 30).catch(() => ({ids: []})),
    M.wdFind(`haswbstatement:P463=${n.id}`, 20).catch(() => ({ids: []})),
    mbid ? M.getJSON("https://labs.api.listenbrainz.org/similar-artists/json?artist_mbids=" + mbid
      + "&algorithm=session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30", 15000).catch(() => []) : []]);
  const simMap = Array.isArray(sim) && sim.length ? await M.fromMB("P434", sim.slice(0, 20).map(x => ({mbid: x.artist_mbid, name: x.name}))).catch(() => ({})) : {};
  const band = [...M.claimIds(e, "P527").map(id => ({id, why: "with bandmate"})), ...members.ids.map(id => ({id, why: "with bandmate"})),
    ...M.claimIds(e, "P463").map(id => ({id, why: "who played in"}))].filter(c => c.id !== n.id).map(c => ({...c, kind: "artist"}));
  const [bandC, simC, recC, prodC, labC] = await Promise.all([
    cands(band), cands(Object.values(simMap).map(x => ({id: x.id, kind: "artist", why: "sounds like"}))),
    cands(recs.ids.map(id => ({id, kind: "record", why: "who made"}))), cands(produced.ids.map(id => ({id, kind: "record", why: "who produced"}))),
    cands(M.claimIds(e, "P264").slice(0, 4).map(id => ({id, kind: "label", why: "signed to"})))]);
  if((await scored).total && n.title) n.chips = [{wing: CINEMA, href: topicIn(CINEMA, n.title)}];
  return asSteps(weave([bandC, simC, recC, prodC, labC]));
}
/* a label's records and artists; a genre's, the same way */
async function fromCollection(n){
  const label = n.kind === "label", prop = label ? "P264" : "P136", nm = M.bare(n.name);
  const [recs, artists] = await Promise.all([
    M.wdFind(`haswbstatement:${prop}=${n.id} haswbstatement:${ALBUMS}`, 60).catch(() => ({ids: []})),
    M.wdFind(`haswbstatement:${prop}=${n.id} haswbstatement:P31=Q5|P31=Q215380|P31=Q5741069`, 40).catch(() => ({ids: []}))]);
  return asSteps(weave([await cands(recs.ids.map(id => ({id, kind: "record", why: label ? `also on ${nm}` : `a ${nm} record`}))),
    await cands(artists.ids.map(id => ({id, kind: "artist", why: label ? `also signed to ${nm}` : `who plays ${nm}`})))]));
}
const next = n => n.kind === "record" ? fromRecord(n) : n.kind === "artist" ? fromArtist(n) : fromCollection(n);
async function recordNode(t){
  const j = await M.getJSON("https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=" + encodeURIComponent(t)).catch(() => null);
  const p = Object.values(j?.query?.pages || {})[0], id = p?.pageprops?.wikibase_item;
  if(!id) return null;
  await M.pics([t]);
  return node("record", {id, name: t, title: t, sub: String(M.yearIn(M.picCache[t]?.desc) || "")});
}

/* ---------- the year dial ---------- */
async function dial(j){
  const years = j ? Object.keys(j.years).filter(y => j.years[y].length >= 6).map(Number) : [];
  const lo = years.length ? Math.min(...years) : 1955, hi = years.length ? Math.max(...years) : new Date().getFullYear() - 1;
  const r = D.rng("metronome-dial-" + D.today());
  const start = Math.max(lo, Math.min(hi, 1960 + Math.floor(r() * 50)));
  const sec = $("d-dial");
  const decades = []; for(let d = Math.ceil(lo / 10) * 10; d <= hi; d += 10) decades.push(d);
  sec.querySelector(".body").innerHTML = `<div class="mt-dial">
      <button type="button" class="mt-step" data-step="-1" aria-label="A year earlier">‹</button>
      <div class="mt-face"><output class="mt-year" id="d-year">${start}</output>
        <div class="mt-scale" style="--lo:${lo};--hi:${hi}">${decades.map(d => `<span style="--x:${(d - lo) / (hi - lo)}">${d}</span>`).join("")}</div>
        <input type="range" id="d-yr" min="${lo}" max="${hi}" value="${start}" step="1" aria-label="Year"></div>
      <button type="button" class="mt-step" data-step="1" aria-label="A year later">›</button></div>
    <div id="d-dial-recs" class="mt-dial-recs"></div>`;
  let me = 0, wait = 0;
  const showYear = async y => {
    const mine = ++me;
    $("d-year").textContent = y;
    const list = await M.ofYear(y).catch(() => []);
    await M.pics(list.slice(0, 30).map(x => x.title));
    if(mine !== me) return;
    const withPic = list.slice(0, 30).filter(x => M.picOf(x.title)).slice(0, 18);
    $("d-dial-recs").innerHTML = withPic.length ? `<div class="wall mt-wall mt-dial-wall">${withPic.map(x => M.rec(x, x.by || "")).join("")}</div>`
      : `<p class="status">Nothing well known on record for ${y} — turn the dial.</p>`;
    sec.hidden = false;
    const g = $("d-dial-recs").querySelector(".mt-dial-wall"); if(g){ wholeRows.splice(0, wholeRows.length, ...wholeRows.filter(x => x.isConnected)); keepWhole(g); }
  };
  const range = $("d-yr");
  range.addEventListener("input", () => { $("d-year").textContent = range.value; clearTimeout(wait); wait = setTimeout(() => showYear(+range.value), 220); });
  sec.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { range.value = Math.max(lo, Math.min(hi, +range.value + +b.dataset.step)); showYear(+range.value); });
  await showYear(start);
}

/* ---------- scenes on a map ---------- */
const qidCache = {};
async function qids(titles){
  const need = titles.filter(t => !(t in qidCache));
  if(need.length){
    const j = await M.getJSON("https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=" + encodeURIComponent(need.join("|"))).catch(() => null);
    const back = {}; for(const m of [...(j?.query?.normalized || []), ...(j?.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
    need.forEach(t => qidCache[t] = "");
    for(const p of Object.values(j?.query?.pages || {})) if(p.pageprops?.wikibase_item) qidCache[back[p.title] || p.title] = p.pageprops.wikibase_item;
  }
  return qidCache;
}
/* a scene's records: those Wikidata tags with it, or else the records of the artists it tags */
const sceneCache = {};
async function sceneRecords(t){
  if(sceneCache[t]) return sceneCache[t];
  const id = (await qids([t]))[t]; if(!id) return [];
  let {list} = await M.bestKnown(`haswbstatement:P136=${id} haswbstatement:${ALBUMS}`, 60).catch(() => ({list: []}));
  if(list.length < 6){
    const who = (await M.wdFind(`haswbstatement:P136=${id}|P135=${id} -haswbstatement:${ALBUMS}`, 30).catch(() => ({ids: []}))).ids;
    if(who.length){
      const more = await M.bestKnown(`haswbstatement:P175=${who.slice(0, 15).join("|P175=")} haswbstatement:${ALBUMS}`, 60).catch(() => ({list: []}));
      const have = new Set(list.map(x => x.id));
      list = [...list, ...more.list.filter(x => !have.has(x.id))].sort((a, b) => b.pop - a.pop);
    }
  }
  list = list.filter(x => x.title).slice(0, 24);
  await M.pics(list.map(x => x.title));
  return sceneCache[t] = list.filter(x => M.picOf(x.title)).slice(0, 14).map(x => ({...x, by: byOf(x.title), year: M.yearIn(M.picCache[x.title]?.desc)}));
}
function sceneMap(){
  if(!window.L) return;
  const sec = $("d-map"); sec.hidden = false;
  sec.querySelector(".body").innerHTML = `<div class="mt-map"><div class="mt-map-draw" id="d-map-draw" role="application" aria-label="A map of music scenes"></div>
    <div class="mt-scene" id="d-scene" aria-live="polite"></div></div>`;
  const map = L.map("d-map-draw", {scrollWheelZoom: false, worldCopyJump: true, zoomSnap: 0.25});
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 12, attribution: "© OpenStreetMap contributors"}).addTo(map);
  const pins = SCENES.map(([city, lat, lon], i) => L.marker([lat, lon], {icon: L.divIcon({className: "mt-pin", html: "<i></i>", iconSize: [18, 18]}), title: city, keyboard: true})
    .addTo(map).on("click", () => select(i)));
  map.fitBounds(L.latLngBounds(SCENES.map(([, lat, lon]) => [lat, lon])), {padding: [28, 28]});
  let at = -1, me = 0;
  const pickScene = async (t, auto = 0) => {
    const mine = ++me;
    $("d-scene").querySelectorAll("[data-scene]").forEach(b => b.setAttribute("aria-pressed", b.dataset.scene === t));
    const out = $("d-scene").querySelector(".mt-scene-recs");
    out.innerHTML = `<p class="status">Finding its records…</p>`;
    const list = await sceneRecords(t);
    if(mine !== me) return;
    if(!list.length && auto){
      const scenes = SCENES[at][3], k = scenes.indexOf(t);
      if(k + 1 < scenes.length) return pickScene(scenes[k + 1], true);
      if(auto < 4) return select((at + 1) % SCENES.length, auto + 1);
    }
    out.innerHTML = (list.length ? `<div class="wall strip mt-strip">${list.map(x => M.rec(x, [x.by, x.year].filter(Boolean).join(" · "))).join("")}</div>` : "")
      + `<p class="mt-scene-open"><a href="${esc(here(t))}">Open ${esc(M.bare(t))}</a></p>`;
  };
  const select = (i, auto = 0) => {
    at = i;
    pins.forEach((p, k) => p.getElement()?.classList.toggle("on", k === i));
    const [city, , , scenes] = SCENES[i];
    $("d-scene").innerHTML = `<h3 class="mt-city">${esc(city)}</h3>
      <div class="mt-scene-pick" role="group" aria-label="Scenes in ${esc(city)}">${scenes.map(t => `<button type="button" data-scene="${esc(t)}" aria-pressed="false">${esc(M.bare(t))}</button>`).join("")}</div>
      <div class="mt-scene-recs"></div>`;
    pickScene(scenes[0], auto);
  };
  $("d-scene").addEventListener("click", ev => { const b = ev.target.closest("[data-scene]"); if(b) pickScene(b.dataset.scene); });
  select(Math.floor(D.rng("metronome-scene-" + D.today())() * SCENES.length), 1);
  /* the map was drawn while the section was still hidden: let it measure itself now */
  setTimeout(() => { map.invalidateSize(); map.fitBounds(L.latLngBounds(SCENES.map(([, lat, lon]) => [lat, lon])), {padding: [28, 28]}); }, 60);
}

/* ---------- live, from the Archive: a concert of the day, played straight through ---------- */
async function showPool(){
  const cached = D.daily.get("metronome-shows");
  if(cached) return cached;
  const j = await M.getJSON("https://archive.org/advancedsearch.php?q=" + encodeURIComponent("collection:etree AND mediatype:etree")
    + "&fl[]=identifier&fl[]=creator&fl[]=date&fl[]=venue&fl[]=coverage&fl[]=downloads&sort[]=downloads+desc&rows=300&output=json", 15000).catch(() => null);
  const list = (j?.response?.docs || []).map(d => ({id: d.identifier, by: [].concat(d.creator || [])[0] || "", date: (d.date || "").slice(0, 10),
    venue: [].concat(d.venue || [])[0] || "", place: [].concat(d.coverage || [])[0] || "", n: +d.downloads || 1})).filter(x => x.by);
  if(list.length) D.daily.set("metronome-shows", list);
  return list;
}
let shows = 0;
async function liveShow(r){
  const pool = await showPool();
  if(!pool.length) return;
  for(let tries = 0; tries < 5; tries++){
    const s = D.pick(pool, x => Math.sqrt(x.n), r);
    const tracks = await M.showTracks(s.id).catch(() => []);
    if(tracks.length < 3) continue;
    /* the band's picture and page, when Wikipedia knows them as musicians: by their name, or "(band)", or a search */
    const MUSIC = /band|musician|singer|group|guitarist|rapper|composer|songwriter|ensemble|duo|trio|quartet|jam/i;
    let t = "";
    await M.pics([s.by, s.by + " (band)"]);
    for(const c of [s.by + " (band)", s.by]) if(!t && M.picOf(c) && MUSIC.test(M.picCache[c]?.desc || "")) t = c;
    if(!t){
      const hits = await M.getJSON("https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&list=search&srlimit=1&srsearch=" + encodeURIComponent(s.by + " band")).catch(() => null);
      const h = hits?.query?.search?.[0]?.title || "";
      if(h && M.norm(M.bare(h)) === M.norm(s.by)){ await M.pics([h]); if(MUSIC.test(M.picCache[h]?.desc || "")) t = h; }
    }
    const isBand = !!t, pic = isBand ? M.picOf(t) : "";
    /* picture first: a show whose band has no picture gives way to another, unless none has */
    if(!pic && tries < 4) continue;
    const sec = $("d-live"), where = [s.venue, s.place].filter(Boolean).join(", ");
    const when = s.date ? new Date(s.date + "T12:00").toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}) : "";
    sec.querySelector(".body").innerHTML = `<div class="mt-lc">
        <a class="mt-lc-img" href="${esc(isBand ? here(t) : "https://archive.org/details/" + encodeURIComponent(s.id))}"${isBand ? "" : ` ${ext}`}>${pic
          ? `<img src="${esc(M.bigger(pic, 500))}" alt="">` : `<img src="https://archive.org/services/img/${esc(encodeURIComponent(s.id))}" alt="">`}</a>
        <div class="mt-lc-text"><p class="mt-lc-kicker">${shows ? "Another night" : "Tonight's concert"}</p>
          <h3 class="mt-lc-by">${isBand ? `<a href="${esc(here(t))}">${esc(s.by)}</a>` : esc(s.by)}</h3>
          <p class="mt-lc-when">${esc([when, where].filter(Boolean).join(" · "))}</p>
          <p class="mt-lc-ctl"><button type="button" id="d-live-play">▶ Play the show</button><button type="button" class="ghost" id="d-live-next">Another show</button>
            <a href="https://archive.org/details/${esc(encodeURIComponent(s.id))}" ${ext}>On the Archive</a></p></div></div>
      <div id="d-live-tracks"></div>`;
    sec.hidden = false; shows++;
    const list = M.trackList($("d-live-tracks"), tracks);
    const label = ev => { const b = $("d-live-play"); if(!b) return; const on = ev?.detail?.list === list.list && ev.detail.playing; b.textContent = on ? "❚❚ Pause" : "▶ Play the show"; b.dataset.on = on ? "1" : ""; };
    document.addEventListener("mt-play", label);
    /* play from the top, or pause and carry on from where it was */
    $("d-live-play").onclick = () => { const on = $("d-live-tracks").querySelector(".fg-track.on [data-play]"); on ? on.click() : list.playAll(); };
    $("d-live-next").onclick = () => { M.stop(); document.removeEventListener("mt-play", label); liveShow(Math.random); };
    return;
  }
}

/* ---------- your collection ---------- */
function showTrail(){
  const html = D.trail.html(24), sec = $("d-trail");
  sec.hidden = !html; sec.querySelector(".body").innerHTML = html;
  const n = D.trail.count(); $("d-count").textContent = `${n} ${n === 1 ? "entry" : "entries"} found`;
}
$("d-clear").onclick = () => { D.trail.clear(); showTrail(); };

/* ---------- start ---------- */
const params = new URLSearchParams(location.search);
/* when a topic page opens straight from a link, the front page waits until the reader comes back to it */
const shown = () => new Promise(ok => {
  if(!document.body.classList.contains("on") && !params.get("t") && !params.get("q") && !params.get("rg")) return ok();
  const mo = new MutationObserver(() => { if(!document.body.classList.contains("on")){ mo.disconnect(); ok(); } });
  mo.observe(document.body, {attributes: true, attributeFilter: ["class"]});
});
(async () => {
  showTrail();
  await shown();
  $("d-shuffle").onclick = () => M.go(CANON[Math.floor(Math.random() * CANON.length)]);
  const today = await hero(D.rng("metronome-hero-" + D.today()));
  const j = await M.data();
  theWall(j);

  /* Drift starts from what the reader asked for (?drift=Q…&k=record|artist|label&name=Title), or from today's record */
  let start = null;
  if(params.get("drift") && params.get("name")){
    const t = params.get("name"), k = ["record", "artist", "label", "genre"].includes(params.get("k")) ? params.get("k") : "artist";
    await M.pics([t]);
    start = node(k, {id: params.get("drift"), name: t, title: t});
    setTimeout(() => $("d-drift").scrollIntoView({behavior: "smooth"}), 300);
  }
  if(!start && today) start = await recordNode(today.t);
  const restart = async () => (await recordNode(CANON[Math.floor(Math.random() * CANON.length)])) || start;
  if(!start) start = await restart();
  if(start){
    $("d-drift").hidden = false;
    D.drift($("d-drift").querySelector(".body"), {start, next, restart,
      visit: n => { D.trail.add({wing: "metronome", title: n.title, name: n.name, img: n.img}); showTrail(); }});
  }
  dial(j);
  sceneMap();
  liveShow(D.rng("metronome-live-" + D.today()));
})();
}
