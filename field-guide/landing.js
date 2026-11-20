/* Myriad — the Field Guide's front page: a species of the day, a wall of what's being seen in the Pacific Northwest
   this week, what's in season this month, Drift through look-alikes and relatives, songs to play one after another,
   and the reader's collection. Everything comes live from iNaturalist (and the songs from Commons). */
{
const {esc} = window.Myriad, D = window.Myriad.discover, F = window.FieldGuide;
const $ = id => document.getElementById(id);
const month = F.thisMonth(), MONTH = F.MONTHS[month - 1];
/* a node without its getter, so it can be kept for the day */
const plain = n => ({id: n.id, key: n.id, kind: "species", shape: "round", name: n.name, sci: n.sci, title: n.title, href: F.here(n.title), img: n.img,
  sub: n.sub, group: n.group, rankLevel: n.rankLevel ?? 10});
const daysAgo = n => { const d = new Date(Date.now() - n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
/* a few well-loved Northwest species, for when iNaturalist can't be reached */
const CANON = ["Steller's jay","Varied thrush","Western redcedar","Orca","Banana slug","Pacific madrone","Great blue heron","Salal","Roosevelt elk","Douglas fir",
  "Bald eagle","Chanterelle","Pacific tree frog","Sword fern","Sea otter","Ochre sea star","Rufous hummingbird","Black bear","Bigleaf maple","Trillium ovatum"];
const SINGERS = ["Ixoreus naevius","Troglodytes pacificus","Melospiza melodia","Turdus migratorius","Zonotrichia atricapilla","Poecile atricapillus","Regulus satrapa",
  "Catharus ustulatus","Pipilo maculatus","Cyanocitta stelleri","Corvus corax","Bubo virginianus","Junco hyemalis","Sitta canadensis","Zonotrichia leucophrys"];

const box = document.createElement("div");
box.id = "discover";
box.innerHTML = `
  <section class="cine-hero fg-hero" id="d-hero" hidden></section>
  <section class="section fg-week" id="d-week" hidden><h2 class="label">Seen this week</h2><p class="sub">The most-sighted species in Washington, Oregon and British Columbia over the last seven days</p><div class="body"></div></section>
  <section class="section" id="d-season" hidden><h2 class="label">In season</h2><p class="sub">${MONTH} in the Pacific Northwest</p><div class="body"></div></section>
  <section class="section" id="d-drift" hidden><h2 class="label">Drift</h2><p class="sub">From one species to the ones it's mistaken for, and on to its relatives</p><div class="body"></div></section>
  <section class="section" id="d-songs" hidden><h2 class="label">Songs of the season</h2><p class="sub">Birds singing in the Northwest this ${MONTH}, recorded for Xeno-canto — one after another</p><div class="body"></div></section>
  <section class="section" id="d-trail" hidden><h2 class="label">Your collection</h2><p class="sub"><span id="d-count"></span> — kept only in this browser <button type="button" class="linkish small" id="d-clear">Clear</button></p><div class="body"></div></section>`;
$("main").prepend(box);
$("chips").insertAdjacentHTML("afterbegin", `<button type="button" class="shuffle" id="d-shuffle" title="Open a Northwest species at random">Shuffle</button>`);

/* ---------- the day's pool: Northwest species seen in this month of the year ---------- */
let POOL = null;
const pool = () => POOL ||= (async () => {
  const cached = D.daily.get("fg-pool-v2");
  if(cached?.length) return cached;
  const list = (await F.counts({place_id: F.PNW, month, per_page: 200})).filter(x => x.node.title !== x.node.sci || x.node.sub).map(x => ({...plain(x.node), count: x.count}));
  if(list.length) D.daily.set("fg-pool-v2", list);
  return list;
})().catch(() => []);
/* a well-known one: among the 80 most seen, in a fixed order, so a seeded pick is the same for everyone today */
const wellKnown = async (r = Math.random) => {
  const l = [...await pool()].sort((a, b) => b.count - a.count).slice(0, 80).sort((a, b) => a.id - b.id);
  return l.length ? D.pick(l, x => Math.sqrt(x.count), r) : null;
};

/* ---------- Species of the day ---------- */
let heroes = 0, heroList = null;
async function hero(r){
  const sec = $("d-hero");
  for(let tries = 0; tries < 5; tries++){
    const s = await wellKnown(r);
    if(!s?.img) break;
    const big = F.size(s.img, "large");
    const ok = await new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = big; });
    if(!ok) continue;
    const d = await F.getJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(s.title.replace(/ /g, "_"))).catch(() => null);
    const desc = d?.description || "";
    sec.innerHTML = `<div class="ch-frame"><div class="ch-bg" style="background-image:url('${esc(big)}')"></div>
      <a class="ch-poster fg-photo" href="${esc(s.href)}"><img src="${esc(big)}" alt="${esc(s.name)}"></a>
      <div class="ch-text"><p class="ch-kicker">${heroes ? "Also out today" : "Species of the day"}</p>
        <h2 class="ch-title"><a href="${esc(s.href)}">${esc(s.name)}</a></h2>
        <p class="fg-hero-sci"><i>${esc(s.sci)}</i></p>
        ${desc ? `<p class="ch-desc">${esc(F.cap(desc))}</p>` : ""}
        <p class="ch-ctl"><a class="ch-open" href="${esc(s.href)}">Open the page</a><span id="ch-hear"></span>
          <button type="button" class="ghost" id="ch-next">Something else</button></p></div></div><div id="ch-song" hidden></div>`;
    sec.hidden = false; heroes++;
    $("ch-next").onclick = () => hero(Math.random);
    heroList = s;
    /* its song, if there's a recording that plays */
    F.commonsSounds([s.sci]).then(async got => {
      const t = await F.verified(got[s.sci] || [], 1);
      if(!t.length || heroList !== s) return;
      t[0].name = s.name;
      const list = F.trackList($("ch-song"), t);
      $("ch-hear").innerHTML = `<button type="button" class="ch-open fg-hear" id="ch-hear-b">▶ Hear it</button>`;
      $("ch-hear-b").onclick = () => $("ch-song").querySelector("[data-play]").click();
      const label = () => { const b = $("ch-hear-b"); if(b) b.textContent = !F.audio.paused && F.audio.src === t[0].src ? "❚❚ Listening" : "▶ Hear it"; };
      F.audio.addEventListener("play", label); F.audio.addEventListener("pause", label); F.audio.addEventListener("ended", label);
    }).catch(() => {});
    return s;
  }
  return null;
}
/* without iNaturalist: a well-loved Northwest species and its Wikipedia picture */
async function heroFallback(r){
  const t = CANON[Math.floor(r() * CANON.length)];
  const j = await F.getJSON("https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=pageimages|description&piprop=thumbnail&pithumbsize=1200&redirects=1&titles=" + encodeURIComponent(t)).catch(() => null);
  const p = Object.values(j?.query?.pages || {})[0];
  if(!p?.thumbnail) return;
  const href = F.here(p.title);
  $("d-hero").innerHTML = `<div class="ch-frame"><div class="ch-bg" style="background-image:url('${esc(p.thumbnail.source)}')"></div>
    <a class="ch-poster fg-photo" href="${esc(href)}"><img src="${esc(p.thumbnail.source)}" alt=""></a>
    <div class="ch-text"><p class="ch-kicker">Species of the day</p><h2 class="ch-title"><a href="${esc(href)}">${esc(p.title)}</a></h2>
    ${p.description ? `<p class="ch-desc">${esc(F.cap(p.description))}</p>` : ""}<p class="ch-ctl"><a class="ch-open" href="${esc(href)}">Open the page</a></p></div></div>`;
  $("d-hero").hidden = false;
}

/* ---------- Seen this week: a dense wall of photographs ---------- */
async function week(){
  const list = await F.counts({place_id: F.PNW, d1: daysAgo(7), quality_grade: "research,needs_id", per_page: 160}).catch(() => []);
  if(list.length < 8) return;
  const tile = x => `<a class="fg-tile" href="${esc(x.node.href)}" data-name="${esc(x.node.name)}" title="${esc(`${x.node.name} — ${F.num(x.count)} ${x.count === 1 ? "sighting" : "sightings"} this week`)}">
    <img src="${esc(x.node.img)}" alt="${esc(x.node.name)}" loading="lazy"></a>`;
  $("d-week").hidden = false;
  const w = innerWidth <= 420 ? 0 : innerWidth <= 760 ? 0 : 108;
  F.capped($("d-week").querySelector(".body"), list, l => `<div class="fg-tiles">${l.map(tile).join("")}</div>`, {tile: w, n: innerWidth <= 420 ? 42 : 40});
}

/* ---------- In season: blooming, migrating, singing, fruiting ---------- */
async function season(){
  const at = {place_id: F.PNW, month};
  const [bloomNative, bloomAll, birdsNow, birdsYear, sing, fungi] = await Promise.all([
    F.counts({...at, iconic_taxa: "Plantae", term_id: 12, term_value_id: 13, native: "true", per_page: 40}),
    F.counts({...at, iconic_taxa: "Plantae", term_id: 12, term_value_id: 13, per_page: 40}),
    F.counts({...at, iconic_taxa: "Aves", per_page: 200}),
    F.counts({place_id: F.PNW, iconic_taxa: "Aves", per_page: 400}),
    F.counts({...at, iconic_taxa: "Aves", sounds: "true", per_page: 40}),
    F.counts({...at, iconic_taxa: "Fungi", per_page: 40})].map(p => p.catch(() => [])));
  const bloom = bloomNative.length >= 8 ? bloomNative : bloomAll;
  /* migrating: birds whose share of this month's sightings is well above their share of the year's */
  const sum = l => l.reduce((a, x) => a + x.count, 0) || 1;
  const nowT = sum(birdsNow), yearT = sum(birdsYear), yearOf = Object.fromEntries(birdsYear.map(x => [x.node.id, x.count]));
  const migr = birdsNow.filter(x => x.count >= 25 && yearOf[x.node.id]).map(x => ({...x, lift: (x.count / nowT) / (yearOf[x.node.id] / yearT)}))
    .filter(x => x.lift >= 1.9).sort((a, b) => b.lift - a.lift).slice(0, 30);
  const TABS = [
    ["bloom", "Blooming", bloom, x => `${F.num(x.count)} in flower`, "Wildflowers and shrubs seen in flower this month"],
    ["migr", "Migrating", migr, x => `${x.lift >= 10 ? "10" : x.lift.toFixed(1).replace(/\.0$/, "")}× its usual`, "Birds seen far more this month than the rest of the year — arriving, leaving or passing through"],
    ["sing", "Singing", sing, x => `${F.num(x.count)} recorded`, "Birds most often recorded singing or calling this month"],
    ["fruit", "Fruiting", fungi, x => `${F.num(x.count)} sightings`, "Mushrooms and other fungi up this month"]].filter(t => t[2].length >= 6);
  if(!TABS.length) return {sing};
  const sec = $("d-season"); sec.hidden = false;
  /* start on the most seasonal: fungi in autumn, flowers in spring and summer */
  const pref = [9, 10, 11, 12].includes(month) ? ["fruit", "migr", "sing", "bloom"] : [3, 4, 5, 6, 7].includes(month) ? ["bloom", "sing", "migr", "fruit"] : ["migr", "sing", "fruit", "bloom"];
  let on = pref.find(k => TABS.some(t => t[0] === k));
  const draw = () => {
    const [, , list, note, sub] = TABS.find(t => t[0] === on);
    sec.querySelector(".body").innerHTML = `<div class="tabs" role="group" aria-label="In season">${TABS.map(([k, label, l]) => `<button type="button" data-tab="${k}" aria-pressed="${k === on}">${label} <span>${l.length}</span></button>`).join("")}</div>
      <p class="chart-note fg-tab-note">${esc(sub)}</p><div class="wall strip fg-strip">${list.slice(0, 30).map(x => F.card(x.node, note(x))).join("")}</div>`;
    /* on a phone the tabs scroll sideways: keep the chosen one in view */
    const tabs = sec.querySelector(".tabs"), b = tabs.querySelector('[aria-pressed="true"]');
    if(b && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft = Math.max(0, b.offsetLeft - tabs.offsetLeft - 8);
  };
  sec.onclick = e => { const b = e.target.closest("[data-tab]"); if(b){ on = b.dataset.tab; draw(); } };
  draw();
  return {sing};
}

/* ---------- Drift: look-alikes and relatives ---------- */
async function threads(n){
  const [sim, tx] = await Promise.all([F.nat("identifications/similar_species", {taxon_id: n.id, per_page: 12}).catch(() => ({results: []})), F.nat("taxa/" + n.id)]);
  const t = tx.results?.[0]; if(!t) return [];
  const anc = t.ancestors || [], genus = anc.find(a => a.rank === "genus"), fam = anc.find(a => a.rank === "family");
  const [gen, famL] = await Promise.all([
    genus ? F.nat("taxa", {parent_id: genus.id, rank: "species", is_active: "true", order_by: "observations_count", per_page: 10}).catch(() => ({results: []})) : {results: []},
    fam ? F.nat("taxa", {taxon_id: fam.id, rank: "species", is_active: "true", order_by: "observations_count", per_page: 24}).catch(() => ({results: []})) : {results: []}]);
  const ok = x => x && x.id !== t.id && x.default_photo && x.rank_level <= 10;
  const famName = fam ? (fam.preferred_common_name ? F.cap(fam.preferred_common_name).toLowerCase() : fam.name) : "";
  const A = sim.results.filter(r => ok(r.taxon)).map(r => ({node: plain(F.node(r.taxon)), why: `Mistaken for it ${F.num(r.count)} ${r.count === 1 ? "time" : "times"}`, w: Math.sqrt(r.count)}));
  const B = gen.results.filter(ok).map(x => ({node: plain(F.node(x)), why: `Same genus, ${genus.name}`, w: Math.sqrt(x.observations_count || 1)}));
  const C = famL.results.filter(x => ok(x) && x.parent_id !== genus?.id).map(x => ({node: plain(F.node(x)), why: `Same family — ${famName}`, w: Math.sqrt(x.observations_count || 1)}));
  /* weighted shuffles, then dealt in turn, so each set of three mixes the kinds of thread */
  const deal = l => { const p = [...l], out = []; while(p.length){ const c = D.pick(p, x => x.w); p.splice(p.indexOf(c), 1); out.push(c); } return out; };
  const piles = [deal(A), deal(B), deal(C)].filter(p => p.length), out = [], seen = new Set();
  while(piles.some(p => p.length)) for(const p of piles){ const c = p.shift(); if(c && !seen.has(c.node.id)){ seen.add(c.node.id); out.push(c); } }
  return out;
}

/* ---------- Songs of the season: a shelf that plays straight through ---------- */
async function songs(sing){
  const singers = (sing || []).slice(0, 18).map(x => x.node);
  const names = singers.length >= 6 ? singers.map(n => n.sci) : SINGERS;
  const got = await F.commonsSounds(names).catch(() => ({}));
  const byName = Object.fromEntries(singers.map(n => [n.sci, n]));
  /* one recording per bird, Xeno-canto's first */
  let tracks = names.filter(n => got[n]?.[0]?.xc).map(n => ({...got[n][0], sci: n}));
  if(tracks.length < 4) tracks = names.filter(n => got[n]?.length).map(n => ({...got[n][0], sci: n}));
  /* the birds' names and photographs for the ones the season didn't bring */
  const missing = tracks.filter(t => !byName[t.sci]).map(t => t.sci);
  if(missing.length) await Promise.all(missing.map(n => F.nat("taxa", {q: n, rank: "species", per_page: 1}).then(j => { const x = j.results?.[0]; if(x) byName[n] = plain(F.node(x)); }).catch(() => {})));
  tracks = tracks.filter(t => byName[t.sci]).map(t => ({...t, name: byName[t.sci].name, img: F.size(byName[t.sci].img, "small"), href: byName[t.sci].href}));
  let ok = await F.verified(tracks, 10, 5);
  /* if Commons can't be reached, iNaturalist observers' recordings from the Northwest this month, one per bird */
  if(ok.length < 3){
    const j = await F.nat("observations", {place_id: F.PNW, month, iconic_taxa: "Aves", sounds: "true", quality_grade: "research", per_page: 80, order_by: "votes"}).catch(() => null);
    const seen = new Set(), more = [];
    for(const o of j?.results || []){
      const snd = (o.sounds || []).find(x => x.file_url);
      if(!snd || o.taxon?.rank !== "species" || seen.has(o.taxon.id)) continue;
      seen.add(o.taxon.id);
      const n = plain(F.node(o.taxon));
      more.push({src: snd.file_url, page: o.uri, from: "iNaturalist", by: (snd.attribution || "").replace(/^\(c\)\s*/, "").replace(/,.*$/, ""),
        lic: (snd.license_code || "").toUpperCase().replace(/^CC-/, "CC "), name: n.name, img: F.size(n.img, "small"), href: n.href, note: o.place_guess || ""});
    }
    ok = await F.verified(more, 10, 8);
    if(ok.length >= 3) $("d-songs").querySelector(".sub").textContent = `Birds recorded in the Northwest in ${MONTH}s past by iNaturalist's observers — one after another`;
  }
  if(ok.length < 3) return;
  const sec = $("d-songs"); sec.hidden = false;
  sec.querySelector(".body").innerHTML = `<div class="fg-song-ctl"><button type="button" id="d-play-all">▶ Play all ${ok.length}</button></div><div id="d-tracks"></div>`;
  const list = F.trackList($("d-tracks"), ok, {chain: true, pics: true});
  $("d-play-all").onclick = list.playAll;
}

/* ---------- Your collection ---------- */
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
  if(!document.body.classList.contains("on") && !params.get("t") && !params.get("q")) return ok();
  const mo = new MutationObserver(() => { if(!document.body.classList.contains("on")){ mo.disconnect(); ok(); } });
  mo.observe(document.body, {attributes: true, attributeFilter: ["class"]});
});
(async () => {
  showTrail();
  await shown();
  $("d-shuffle").onclick = async () => { const s = await wellKnown(); if(s) F.go(s.title); else F.go(CANON[Math.floor(Math.random() * CANON.length)]); };
  const today = await hero(D.rng("fg-hero-" + D.today()));
  if(!today) heroFallback(D.rng("fg-hero-" + D.today()));
  week();
  const seasonP = season();

  /* Drift starts from a species the reader asked for (?drift=<iNaturalist id>&name=Title), or from today's */
  let start = today ? {...today} : null;
  if(params.get("drift")){
    const t = await F.nat("taxa/" + encodeURIComponent(params.get("drift"))).then(j => j.results?.[0]).catch(() => null);
    if(t){ start = plain(F.node(t)); setTimeout(() => $("d-drift").scrollIntoView({behavior: "smooth"}), 300); }
  }
  if(start){
    $("d-drift").hidden = false;
    D.drift($("d-drift").querySelector(".body"), {start, next: threads,
      restart: async () => (await wellKnown()) || start,
      visit: n => { D.trail.add({wing: "field-guide", title: n.title, name: n.name, img: F.size(n.img, "small")}); showTrail(); }});
  }
  const {sing} = await seasonP;
  songs(sing);
})();
}
