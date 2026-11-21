/* Myriad — the Observatory's front page: NASA's picture of the day, a wall of the sky, an object of the day, what's up tonight,
   the next launches, Drift from a world to the spacecraft that went there and what they found, a walk outward from Earth,
   spaceflight on this day, and the visitor's collection. */
{
const {esc} = window.Myriad, D = window.Myriad.discover, O = window.Obs, Sky = window.Sky;
const $ = id => document.getElementById(id);
const ext = `target="_blank" rel="noopener"`;
const here = O.here;

/* the wall: things that photograph beautifully, by their English Wikipedia titles */
const WALL = ["Mercury (planet)","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto","Moon","Sun","Io (moon)","Europa (moon)","Ganymede (moon)",
  "Callisto (moon)","Titan (moon)","Enceladus","Triton (moon)","Phobos (moon)","Charon (moon)","Mimas (moon)","Iapetus (moon)","Miranda (moon)","Ceres (dwarf planet)",
  "Arrokoth","67P/Churyumov–Gerasimenko","Halley's Comet","Comet Hale–Bopp","101955 Bennu","4 Vesta","Great Red Spot","Olympus Mons","Valles Marineris",
  "Orion Nebula","Crab Nebula","Eagle Nebula","Pillars of Creation","Carina Nebula","Horsehead Nebula","Ring Nebula","Helix Nebula","Cat's Eye Nebula","Lagoon Nebula",
  "Trifid Nebula","Butterfly Nebula","Tarantula Nebula","Veil Nebula","Southern Ring Nebula","Bubble Nebula (NGC 7635)","Rosette Nebula","Andromeda Galaxy",
  "Whirlpool Galaxy","Sombrero Galaxy","Pinwheel Galaxy","Triangulum Galaxy","Large Magellanic Cloud","Small Magellanic Cloud","Cartwheel Galaxy","Centaurus A",
  "Messier 87","Stephan's Quintet","Antennae Galaxies","Milky Way","Black Eye Galaxy","NGC 1300","Pleiades","Betelgeuse","Eta Carinae","Omega Centauri","Cassiopeia A",
  "Voyager 1","Voyager 2","Cassini–Huygens","Juno (spacecraft)","New Horizons","Hubble Space Telescope","James Webb Space Telescope","Curiosity (rover)",
  "Perseverance (rover)","Ingenuity (helicopter)","Apollo 11","Apollo 8","Apollo 17","Sputnik 1","International Space Station","Rosetta (spacecraft)",
  "Parker Solar Probe","Galileo (spacecraft)","Pioneer 10","Viking 1","Opportunity (rover)","Hayabusa2","Artemis I","Skylab","Mir","Earthrise","The Blue Marble",
  "Pale Blue Dot","Hubble Ultra-Deep Field","Webb's First Deep Field","Chandrayaan-3","Kepler space telescope","OSIRIS-REx","Double Asteroid Redirection Test"];
/* the object of the day: worlds, stars and galaxies Wikidata has good numbers for */
const OBJECTS = ["Jupiter","Saturn","Mars","Venus","Mercury (planet)","Uranus","Neptune","Pluto","Moon","Europa (moon)","Titan (moon)","Io (moon)","Ganymede (moon)",
  "Enceladus","Triton (moon)","Betelgeuse","Sirius","Antares","Rigel","Vega","Polaris","Proxima Centauri","Andromeda Galaxy","Whirlpool Galaxy","Sombrero Galaxy",
  "Large Magellanic Cloud","Triangulum Galaxy","Orion Nebula","Crab Nebula","Eagle Nebula","Ring Nebula","Pleiades","Sun","Ceres (dwarf planet)","Eta Carinae",
  "UY Scuti","Alpha Centauri","Callisto (moon)","Arcturus","Aldebaran"];
/* worlds many spacecraft have reached, with moons of their own: where Drift starts, so the first step has threads to pull */
const VISITED = ["Jupiter","Saturn","Mars","Venus","Mercury (planet)","Uranus","Neptune","Pluto","Moon"];
/* pictures for the top when NASA's picture of the day can't be had */
const HERO = ["Pillars of Creation","Earthrise","Carina Nebula","Hubble Ultra-Deep Field","The Blue Marble","Saturn","Jupiter","Crab Nebula","Andromeda Galaxy",
  "Horsehead Nebula","Webb's First Deep Field","Orion Nebula","Whirlpool Galaxy","Eagle Nebula"];

const box = document.createElement("div");
box.id = "discover";
box.innerHTML = `
  <section class="cine-hero ob-hero" id="d-hero" hidden></section>
  <section class="section ob-wallsec" id="d-wall" hidden><h2 class="label">The sky</h2><p class="sub">A different spread every day — open any one</p><div class="body"></div></section>
  <section class="section" id="d-object" hidden><h2 class="label">Object of the day</h2><div class="body"></div></section>
  <section class="section" id="d-tonight" hidden><h2 class="label">Tonight</h2><p class="sub" id="d-tonight-sub"></p><div class="body"></div></section>
  <section class="section" id="d-launch" hidden><h2 class="label">Next launches</h2><p class="sub">From Launch Library 2 — times in your time zone</p><div class="body"></div></section>
  <section class="section" id="d-drift" hidden><h2 class="label">Drift</h2><p class="sub">From a world to the spacecraft that went there, and on to what they found</p><div class="body"></div></section>
  <section class="section" id="d-scale" hidden><h2 class="label">Outward from Earth</h2><p class="sub">One step at a time, to the edge of what we can see</p><div class="body"></div></section>
  <section class="section" id="d-day" hidden><h2 class="label">On this day</h2><p class="sub" id="d-day-sub"></p><div class="body"></div></section>
  <section class="section" id="d-trail" hidden><h2 class="label">Your collection</h2><p class="sub"><span id="d-count"></span> — kept only in this browser <button type="button" class="linkish small" id="d-clear">Clear</button></p><div class="body"></div></section>`;
$("main").prepend(box);
$("chips").insertAdjacentHTML("afterbegin", `<button type="button" class="shuffle" id="d-shuffle" title="Open something in the sky at random">Shuffle</button>`);
const loaded = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i.naturalWidth > 0); i.onerror = () => ok(false); i.src = src; });
/* Wikimedia serves thumbnails only at its standard widths */
const bigger = (src, w) => { w = [330, 500, 960, 1280].find(x => x >= w) || 1280; return /\/\d+px-/.test(src) ? src.replace(/\/\d+px-/, `/${w}px-`) : src; };

/* ---------- the picture of the day: NASA's, or else one of the great ones ---------- */
let heroes = 0;
async function apod(){
  const cached = D.daily.get("ob-apod");
  if(cached) return cached;
  const j = await O.getJSON("https://api.nasa.gov/planetary/apod?thumbs=true&api_key=DEMO_KEY", 12000, 1).catch(() => null);
  if(!j?.title) return null;
  const src = j.media_type === "image" ? j.url : j.thumbnail_url;
  if(!src) return null;
  const day = (j.date || "").replace(/^\d\d(\d\d)-(\d\d)-(\d\d)$/, "$1$2$3");
  const a = {title: j.title, src, big: j.hdurl || src, date: j.date, by: (j.copyright || "").replace(/\s+/g, " ").trim(), text: j.explanation || "",
    page: day.length === 6 ? `https://apod.nasa.gov/apod/ap${day}.html` : "https://apod.nasa.gov/apod/astropix.html", video: j.media_type !== "image"};
  D.daily.set("ob-apod", a);
  return a;
}
async function hero(r, fromNasa = true){
  const sec = $("d-hero");
  const a = fromNasa ? await apod() : null;
  if(a && await loaded(a.src)){
    const when = a.date ? new Date(a.date + "T12:00").toLocaleDateString("en-US", {month: "long", day: "numeric"}) : "";
    sec.innerHTML = `<div class="ch-frame"><div class="ch-bg" style="background-image:url('${esc(a.src)}')"></div>
      <a class="ch-poster ob-photo" href="${esc(a.page)}" ${ext}><img src="${esc(a.src)}" alt="${esc(a.title)}"></a>
      <div class="ch-text"><p class="ch-kicker">Picture of the day${when ? ` · ${esc(when)}` : ""}</p>
        <h2 class="ch-title"><a href="${esc(a.page)}" ${ext}>${esc(a.title)}</a></h2>
        ${a.by ? `<p class="ob-hero-by">${esc(a.by)}</p>` : ""}
        ${a.text ? `<p class="ch-desc ob-hero-text">${esc(a.text)}</p>` : ""}
        <p class="ch-ctl"><a class="ch-open" href="${esc(a.page)}" ${ext}>${a.video ? "▶ Watch on APOD" : "See it full size"}</a>
          <button type="button" class="ghost" id="ch-next">Something else</button></p></div></div>`;
    sec.hidden = false; heroes++;
    $("ch-next").onclick = () => hero(Math.random, false);
    return;
  }
  /* one of the great pictures, from Wikipedia */
  for(let tries = 0; tries < 5; tries++){
    const t = HERO[Math.floor(r() * HERO.length)];
    await O.pics([t], 1280);
    const p = O.picCache[t]; if(!p?.src || !await loaded(p.src)) continue;
    const desc = p.desc ? O.cap(p.desc) : "";
    sec.innerHTML = `<div class="ch-frame"><div class="ch-bg" style="background-image:url('${esc(p.src)}')"></div>
      <a class="ch-poster ob-photo" href="${esc(here(t))}"><img src="${esc(p.src)}" alt=""></a>
      <div class="ch-text"><p class="ch-kicker">${heroes ? "Another picture" : "Picture of the day"}</p>
        <h2 class="ch-title"><a href="${esc(here(t))}">${esc(O.bare(t))}</a></h2>${desc ? `<p class="ch-desc">${esc(desc)}</p>` : ""}
        <p class="ch-ctl"><a class="ch-open" href="${esc(here(t))}">Open the page</a><button type="button" class="ghost" id="ch-next">Something else</button></p></div></div>`;
    sec.hidden = false; heroes++;
    $("ch-next").onclick = () => hero(Math.random, false);
    return;
  }
}

/* ---------- the wall ---------- */
async function wall(){
  const r = D.rng("ob-wall-" + D.today()), pool = [...WALL], pick = [];
  while(pool.length) pick.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  await O.pics(pick, 330);
  const shown = pick.filter(t => O.picCache[t]?.src);
  if(shown.length < 8) return;
  $("d-wall").hidden = false;
  const tile = t => `<a class="fg-tile" href="${esc(here(t))}" data-name="${esc(O.bare(t))}" title="${esc(O.bare(t))}"><img src="${esc(O.picCache[t].src)}" alt="${esc(O.bare(t))}" loading="lazy"></a>`;
  O.capped($("d-wall").querySelector(".body"), shown, l => `<div class="fg-tiles ob-tiles">${l.map(tile).join("")}</div>`, {n: 40, tile: innerWidth <= 760 ? 0 : 128});
}

/* ---------- object of the day ---------- */
async function objectOfDay(){
  const r = D.rng("ob-object-" + D.today());
  for(let tries = 0; tries < 4; tries++){
    const t = OBJECTS[Math.floor(r() * OBJECTS.length)];
    const s = await O.summary(t).catch(() => null);
    if(!s?.wikibase_item || !s.thumbnail) continue;
    const e = await O.entity(s.wikibase_item).catch(() => null);
    if(!e) continue;
    const live = O.PLANET_IDS[s.wikibase_item] ? Sky.distanceKm(O.PLANET_IDS[s.wikibase_item]) : s.wikibase_item === "Q525" ? Sky.distanceKm("sun") : null;
    const kind = s.wikibase_item === "Q525" ? "sun" : /galax/i.test(s.description || "") ? "galaxy" : /moon|satellite/i.test(s.description || "") || s.wikibase_item === "Q405" ? "moon"
      : /planet/i.test(s.description || "") ? "planet" : "object";
    const tiles = O.numbers(e, {kind, live}).slice(0, 4);
    if(tiles.length < 2) continue;
    const img = bigger(s.thumbnail.source, 960);
    const first = (s.extract || "").split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
    $("d-object").querySelector(".body").innerHTML = `<div class="ob-od">
      <a class="ob-od-pic" href="${esc(here(s.title))}"><img src="${esc(img)}" alt="${esc(O.bare(s.title))}" loading="lazy"></a>
      <div class="ob-od-text"><h3 class="ob-od-name"><a href="${esc(here(s.title))}">${esc(O.bare(s.title))}</a></h3>
        ${s.description ? `<p class="ob-od-desc">${esc(O.cap(s.description))}</p>` : ""}
        ${O.numbersHtml(tiles)}
        ${first ? `<p class="ob-od-extract">${esc(first)}</p>` : ""}
        <p class="ob-od-open"><a href="${esc(here(s.title))}">Open the page</a></p></div></div>`;
    $("d-object").hidden = false;
    return {id: s.wikibase_item, title: s.title, name: O.bare(s.title), img: s.thumbnail.source};
  }
  return null;
}

/* ---------- tonight ---------- */
const NAKED = ["mercury", "venus", "mars", "jupiter", "saturn"];
const TITLE = {mercury: "Mercury (planet)", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", moon: "Moon"};
/* the Moon as it looks tonight, drawn: the lit part bounded by the terminator ellipse */
function moonDrawing(m){
  const R = 44, k = m.fraction, waxing = m.phase < 0.5;
  const x = R * Math.abs(1 - 2 * k), lit = waxing ? 1 : 0;
  /* right limb lit when waxing (as seen from the north); the terminator bulges out when gibbous */
  const outer = `M50,${50 - R} A${R},${R} 0 0 ${lit} 50,${50 + R}`;
  const inner = `A${x},${R} 0 0 ${k > 0.5 ? lit : 1 - lit} 50,${50 - R}`;
  return `<svg class="ob-moon" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" class="dark"/><path d="${outer} ${inner}Z" class="lit"/></svg>`;
}
const hhmm = t => new Date(t).toLocaleTimeString([], {hour: "numeric", minute: "2-digit"});
async function tonight(){
  const now = Date.now(), m = Sky.moon(now);
  const toFull = ((0.5 - m.phase + 1) % 1) * 29.53, toNew = ((1 - m.phase) % 1) * 29.53;
  const planets = NAKED.map(n => ({n, ...Sky.planet(n, now)}));
  await O.pics([...Object.values(TITLE)], 330);
  const sec = $("d-tonight");
  const where = p => Math.abs(p.elong) < 16 ? "Lost in the Sun's glare" : Math.abs(p.elong) > 145 ? "Up all night" : p.elong > 0 ? "Evening sky — after sunset" : "Morning sky — before dawn";
  const plCard = (p, line) => `<a class="ob-pl" href="${esc(here(TITLE[p.n]))}"><span class="ob-pl-img">${O.picCache[TITLE[p.n]]?.src ? `<img src="${esc(O.picCache[TITLE[p.n]].src)}" alt="" loading="lazy">` : ""}</span>
    <span class="ob-pl-name">${esc(O.bare(TITLE[p.n]))}</span><span class="ob-pl-when">${esc(line)}</span><span class="ob-pl-mag">${p.mag < -3 ? "Dazzling" : p.mag < 0 ? "Very bright" : p.mag < 1.5 ? "Bright" : "Faint"} · magnitude ${p.mag.toFixed(1)}</span></a>`;
  const draw = loc => {
    let cards, away;
    if(loc){
      const res = Sky.tonight(loc.lat, loc.lng, ["moon", ...NAKED]);
      const ok = res.dark ? res.things.slice(1).map((q, k) => ({p: planets[k], q})) : [];
      const up = ok.filter(x => x.q?.up && x.q.best.alt > 8).sort((a, b) => a.p.mag - b.p.mag);
      away = planets.filter(p => !up.some(x => x.p === p));
      cards = up.map(({p, q}) => plCard(p, `Best ${hhmm(q.best.t)}, ${Math.round(q.best.alt)}° up in the ${Sky.compass(q.best.az)}`));
      const mq = res.dark && res.things[0];
      $("d-tonight-sub").textContent = res.dark ? `From where you are, ${hhmm(res.dark.from)} to ${hhmm(res.dark.to)} — your location stays in this browser` : "No real darkness where you are tonight";
      m.line = mq?.up ? `Up tonight — highest ${hhmm(mq.best.t)} in the ${Sky.compass(mq.best.az)}` : "Not up after dark tonight";
    } else {
      const vis = planets.filter(p => Math.abs(p.elong) >= 16).sort((a, b) => a.mag - b.mag);
      away = planets.filter(p => Math.abs(p.elong) < 16);
      cards = vis.map(p => plCard(p, where(p)));
      $("d-tonight-sub").textContent = new Date().toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric"});
    }
    const moonCard = `<a class="ob-pl ob-pl-moon" href="${esc(here("Moon"))}"><span class="ob-pl-img">${moonDrawing(m)}</span><span class="ob-pl-name">${esc(Sky.phaseName(m.phase))}</span>
      <span class="ob-pl-when">${Math.round(m.fraction * 100)}% lit · ${m.phase < 0.5 ? `full in ${Math.max(1, Math.round(toFull))} days` : `new in ${Math.max(1, Math.round(toNew))} days`}</span>${m.line ? `<span class="ob-pl-mag">${esc(m.line)}</span>` : ""}</a>`;
    sec.querySelector(".body").innerHTML = `<div class="ob-pls">${moonCard}${cards.join("")}</div>
      ${away.length ? `<p class="chart-note">Not in tonight's sky: ${away.map(p => O.bare(TITLE[p.n])).join(", ")}</p>` : ""}
      ${loc ? "" : `<p class="ob-ask"><button type="button" class="ghost" id="d-locate">Use my location</button></p>`}`;
    $("d-locate") && ($("d-locate").onclick = () => locate(true));
  };
  const locate = ask => {
    if(!navigator.geolocation) return;
    if(ask){ $("d-locate").disabled = true; $("d-locate").textContent = "Finding you…"; }
    navigator.geolocation.getCurrentPosition(pos => draw({lat: pos.coords.latitude, lng: pos.coords.longitude}),
      () => { if($("d-locate")){ $("d-locate").disabled = false; $("d-locate").textContent = "Use my location"; } }, {maximumAge: 600000, timeout: 15000});
  };
  draw(null);
  sec.hidden = false;
  try { if((await navigator.permissions.query({name: "geolocation"})).state === "granted") locate(false); } catch(e){}
}

/* ---------- the next launches (Launch Library 2 allows a few requests an hour without a key: keep the answer for an hour) ---------- */
async function launches(){
  let list = D.store.get("ob-launches", null);
  if(!list || Date.now() - list.at > 3600e3){
    const j = await O.getJSON("https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=16&mode=normal&hide_recent_previous=true", 15000, 1).catch(() => null);
    if(j?.results){ list = {at: Date.now(), items: j.results.map(l => ({name: l.name, net: l.net, status: l.status?.abbrev || "", provider: l.launch_service_provider?.name || "",
      rocket: l.rocket?.configuration?.full_name || l.rocket?.configuration?.name || "", mission: l.mission?.name || "", orbit: l.mission?.orbit?.name || "",
      where: l.pad?.location?.name || "", img: (typeof l.image === "string" ? l.image : l.image?.thumbnail_url || l.image?.image_url) || ""}))}; D.store.set("ob-launches", list); }
  }
  const items = (list?.items || []).filter(l => Date.parse(l.net) > Date.now() - 2 * 3600e3 && l.img);
  if(!items.length) return;
  const ok = await Promise.all(items.map(l => loaded(l.img)));
  const shown = items.filter((_, k) => ok[k]).slice(0, 12);
  if(!shown.length) return;
  const until = t => { const s = (Date.parse(t) - Date.now()) / 1000; return s < 0 ? "Lifting off now" : s < 3600 ? `In ${Math.round(s / 60)} min` : s < 172800 ? `In ${Math.round(s / 3600)} hours` : `In ${Math.round(s / 86400)} days`; };
  const when = t => new Date(t).toLocaleString([], {weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"});
  $("d-launch").querySelector(".body").innerHTML = `<div class="ob-launches">${shown.map(l => `<a class="ob-launch" href="./?q=${encodeURIComponent(l.rocket || l.name.split("|")[0].trim())}">
    <span class="ob-ln-img"><img src="${esc(l.img)}" alt="" loading="lazy"><b class="ob-ln-until">${esc(until(l.net))}</b></span>
    <span class="ob-ln-name">${esc(l.mission || l.name)}</span>
    <span class="ob-ln-meta">${esc([l.rocket, l.provider].filter(Boolean).join(" · "))}</span>
    <span class="ob-ln-meta">${esc(when(l.net))}${l.status && l.status !== "Go" ? ` · ${esc(l.status === "TBD" ? "date not yet fixed" : l.status === "TBC" ? "to be confirmed" : l.status)}` : ""}</span>
    ${l.where ? `<span class="ob-ln-meta">${esc(l.where)}</span>` : ""}</a>`).join("")}</div>`;
  $("d-launch").hidden = false;
}

/* ---------- Drift: a world → the spacecraft that went there → what they found → … ---------- */
const nodeOf = (id, title, name, img, kind, sub = "") => ({key: id, id, kind, title, name: O.bare(name || title), href: here(title), img: img || "", sub, shape: "round"});
async function threads(n){
  const out = [];
  if(n.kind === "object"){
    const [vis, kids, up] = await Promise.all([
      O.visitors(n.id).then(O.visitRows).catch(() => []),
      O.sparql(`SELECT ?x ?xLabel (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) WHERE { ?x wdt:P397 wd:${n.id} . MINUS { ?x wdt:P619 [] }
        ?x wikibase:sitelinks ?sl . FILTER(?sl >= 15) ?art schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> . OPTIONAL { ?x wdt:P18 ?img }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } GROUP BY ?x ?xLabel ORDER BY DESC(?pop) LIMIT 12`).catch(() => []),
      O.sparql(`SELECT ?x ?xLabel (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) WHERE { wd:${n.id} wdt:P397 ?x . ?art schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> .
        OPTIONAL { ?x wdt:P18 ?img } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } GROUP BY ?x ?xLabel LIMIT 2`).catch(() => [])]);
    const m = vis.filter(v => !v.future && v.pop >= 10).map(v => ({node: nodeOf(v.id, v.title, v.name, O.commons(v.patch || v.pic, 300), "mission", String(v.launch)),
      why: `${O.HOW[v.how]} it, ${v.year}`, w: Math.sqrt(v.pop) * 1.6}));
    const k = kids.map(r => ({node: nodeOf(O.qid(r.x), O.artTitle(r.a), O.label(r, "x"), O.commons(r.pic, 300), "object"), why: `Goes around ${n.name}`, w: Math.sqrt(+r.pop)}));
    const u = up.filter(r => O.qid(r.x) !== "Q525" || n.kind === "object").map(r => ({node: nodeOf(O.qid(r.x), O.artTitle(r.a), O.label(r, "x"), O.commons(r.pic, 300), "object"), why: `${n.name} goes around it`, w: 3}));
    out.push(...deal([m, k, u]));
  } else {
    const [dest, found, near] = await Promise.all([
      O.destinations(n.id).catch(() => []), O.discoveries(n.id).catch(() => []),
      O.sparql(`SELECT ?x ?xLabel ?rel (SAMPLE(?logo) AS ?patch) (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) (MIN(YEAR(?l)) AS ?y) WHERE {
        { wd:${n.id} wdt:P155 ?x . BIND("before" AS ?rel) } UNION { wd:${n.id} wdt:P156 ?x . BIND("after" AS ?rel) } UNION { ?x wdt:P155 wd:${n.id} . BIND("after" AS ?rel) }
        ?art schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> . OPTIONAL { ?x wdt:P154 ?logo } OPTIONAL { ?x wdt:P18 ?img } OPTIONAL { ?x wdt:P619 ?l }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } GROUP BY ?x ?xLabel ?rel LIMIT 6`).catch(() => [])]);
    const verb = {flyby: "Flew past", orbit: "Orbited", land: "Landed on", to: "Went to", visit: "Reached"};
    const a = dest.filter(r => !["Q2", "Q1491"].includes(O.qid(r.t))).map(r => ({node: nodeOf(O.qid(r.t), O.artTitle(r.a), O.label(r, "t"), O.commons(r.pic, 300), "object"),
      why: `${verb[O.howOf(r.how)]} it${r.when ? ", " + r.when.slice(0, 4) : ""}`, w: Math.sqrt(+r.pop)}));
    const b = found.map(r => ({node: nodeOf(O.qid(r.x), O.artTitle(r.a), O.label(r, "x"), O.commons(r.pic, 300), "object"), why: `${n.name} found it${r.when ? ", " + r.when.slice(0, 4) : ""}`, w: Math.sqrt(+r.pop) * 1.4}));
    const c = near.map(r => ({node: nodeOf(O.qid(r.x), O.artTitle(r.a), O.label(r, "x"), O.commons(r.patch || r.pic, 300), "mission", r.y || ""),
      why: r.rel === "before" ? "Came before it" : "Came after it", w: 2}));
    out.push(...deal([a, b, c]));
  }
  /* a thread needs a picture to show; fill in Wikipedia's where Wikidata has none */
  const bare = out.filter(c => !c.node.img).map(c => c.node.title);
  if(bare.length){ await O.pics(bare, 330); out.forEach(c => { if(!c.node.img) c.node.img = O.picCache[c.node.title]?.src || ""; }); }
  return out.filter(c => c.node.img && c.node.title);
}
/* weighted shuffles of each kind of thread, dealt in turn, so each set of three mixes them */
const deal = piles => {
  const shuf = l => { const p = [...l], o = []; while(p.length){ const c = D.pick(p, x => x.w); p.splice(p.indexOf(c), 1); o.push(c); } return o; };
  const ps = piles.map(shuf).filter(p => p.length), out = [], seen = new Set();
  while(ps.some(p => p.length)) for(const p of ps){ const c = p.shift(); if(c && c.node.title && !seen.has(c.node.key)){ seen.add(c.node.key); out.push(c); } }
  return out;
};
async function resolve(title){
  const s = await O.summary(title).catch(() => null);
  return s?.wikibase_item ? nodeOf(s.wikibase_item, s.title, s.title, s.thumbnail?.source || "", "object", s.description ? O.cap(s.description) : "") : null;
}

/* ---------- Outward from Earth ---------- */
/* Voyager 1 is about one light-day out in November 2026, and moving out about 3.6 AU a year */
const voyager = () => (173.1 + 3.57 * (Date.now() - Date.UTC(2026, 10, 15)) / 3.156e10) * Sky.AU;
const STEPS = [
  {t: "International Space Station", km: () => 408, name: "The Space Station"}, {t: "Moon", km: () => Sky.distanceKm("moon")},
  {t: "Venus", km: () => Sky.distanceKm("venus")}, {t: "Mars", km: () => Sky.distanceKm("mars")}, {t: "Sun", km: () => Sky.distanceKm("sun")},
  {t: "Mercury (planet)", km: () => Sky.distanceKm("mercury")}, {t: "Jupiter", km: () => Sky.distanceKm("jupiter")}, {t: "Saturn", km: () => Sky.distanceKm("saturn")},
  {t: "Uranus", km: () => Sky.distanceKm("uranus")}, {t: "Neptune", km: () => Sky.distanceKm("neptune")}, {t: "Pluto", km: () => 35.6 * Sky.AU},
  {t: "Voyager 1", km: voyager}, {t: "Proxima Centauri", ly: 4.24}, {t: "Sirius", ly: 8.6}, {t: "Vega", ly: 25}, {t: "Pleiades", ly: 444}, {t: "Betelgeuse", ly: 550},
  {t: "Orion Nebula", ly: 1344}, {t: "Pillars of Creation", ly: 5700}, {t: "Galactic Center", ly: 26700, name: "The heart of the Milky Way"},
  {t: "Large Magellanic Cloud", ly: 163000}, {t: "Andromeda Galaxy", ly: 2.5e6}, {t: "Whirlpool Galaxy", ly: 31e6}, {t: "Virgo Cluster", ly: 54e6},
  {t: "Hubble Ultra-Deep Field", ly: 13e9, name: "The faintest galaxies Hubble found"}, {t: "Cosmic microwave background", ly: 13.8e9, name: "The afterglow of the Big Bang"}];
/* a scale model, in the plainest unit */
const metres = m => m < 0.001 ? `${(m * 1000).toFixed(2)} mm` : m < 0.01 ? `${(m * 1000).toFixed(1)} mm` : m < 1 ? `${Math.round(m * 100)} cm`
  : m < 1000 ? `${O.num(m, m < 10 ? 1 : 0)} m` : `${O.words(m / 1000)} km`;
const PLACES = [[384400e3, "the Moon"], [40075e3, "all the way round Earth"], [5570e3, "London to New York"], [3940e3, "New York to Los Angeles"], [1000e3, "the length of Great Britain"],
  [42e3, "a marathon"], [5e3, "a walk across a small town"]];
function model(s){
  const km = s.km;
  if(km < 3e4 * O.LY){
    const m = km * 0.1 / 1.3927e6;
    const near = PLACES.find(([d]) => m > d * 0.55 && m < d * 1.8);
    return `If the Sun were a grapefruit, Earth would be a grain of sand ${metres(1.496e8 * 0.1 / 1.3927e6)} away — and this would be ${metres(m)} from it${near ? `, about ${near[1]}` : ""}.`;
  }
  const m = km / O.LY * 0.25 / 1e5;
  return `If the Milky Way were a dinner plate, this would be ${metres(m)} away.`;
}
async function scaleWalk(){
  const steps = STEPS.map(s => ({...s, km: s.km ? s.km() : s.ly * O.LY})).sort((a, b) => a.km - b.km);
  await O.pics(steps.map(s => s.t), 500);
  const list = steps.filter(s => O.picCache[s.t]?.src);
  if(list.length < 6) return;
  let at = 0;
  const lo = Math.log10(list[0].km), hi = Math.log10(list.at(-1).km);
  const draw = () => {
    const s = list[at], ly = s.km / O.LY;
    const how = ly >= 0.5 ? `${O.words(ly)} light-years` : O.dist(s.km);
    const light = ly >= 0.5 ? `Its light left ${O.words(ly)} years ago` : `Light takes ${O.lightTime(s.km)}`;
    $("d-scale").querySelector(".body").innerHTML = `<div class="ob-walk">
      <a class="ob-walk-pic" href="${esc(here(s.t))}"><img src="${esc(bigger(O.picCache[s.t].src, 960))}" alt="${esc(s.name || O.bare(s.t))}"></a>
      <div class="ob-walk-text"><p class="ob-walk-step">Step ${at + 1} of ${list.length}</p>
        <h3 class="ob-walk-name"><a href="${esc(here(s.t))}">${esc(s.name || O.bare(s.t))}</a></h3>
        <p class="ob-walk-far">${esc(how)}</p><p class="ob-walk-light">${esc(light)}${s.ly ? "" : " — today"}</p>
        <p class="ob-walk-model">${esc(model(s))}</p>
        <p class="ob-walk-ctl"><button type="button" class="ghost" data-step="-1"${at ? "" : " disabled"}>← Closer</button><button type="button" data-step="1"${at < list.length - 1 ? "" : " disabled"}>Further out →</button></p></div></div>
      <div class="ob-ruler" role="group" aria-label="Every step, on a scale where each mark is ten times further">${list.map((x, k) => `<button type="button" class="ob-tick${k === at ? " on" : ""}" data-at="${k}"
        style="--x:${((Math.log10(x.km) - lo) / (hi - lo) * 100).toFixed(2)}%" title="${esc(x.name || O.bare(x.t))}" aria-label="${esc(x.name || O.bare(x.t))}"></button>`).join("")}
        <span class="ob-ruler-l">Earth</span><span class="ob-ruler-r">The edge of sight</span></div>`;
  };
  $("d-scale").onclick = e => {
    const b = e.target.closest("[data-step], [data-at]"); if(!b) return;
    at = b.dataset.at !== undefined ? +b.dataset.at : Math.max(0, Math.min(list.length - 1, at + +b.dataset.step));
    draw();
  };
  draw();
  $("d-scale").hidden = false;
}

/* ---------- spaceflight on this day ---------- */
async function onThisDay(){
  const j = await fetch("days.json?v=" + (document.querySelector('script[src*="landing.js"]')?.src.split("v=")[1] || "1")).then(r => r.ok ? r.json() : null).catch(() => null);
  if(!j) return;
  const F = j.fields, md = D.monthDay();
  const rows = (j.days[md] || []).map(a => Object.fromEntries(F.map((k, i) => [k, a[i]]))).filter(x => x.enwiki);
  if(!rows.length) return;
  const verb = {launch: "Launched", land: "Landed", found: "Discovered"};
  const items = rows.slice(0, 40).map(x => ({id: x.id, title: x.enwiki, name: O.bare(x.enwiki), src: x.image ? O.commons(O.filePath(x.image), 300) : "", year: +x.date.slice(0, 4), kind: x.kind}));
  await O.pics(items.filter(x => !x.src).map(x => x.title));
  const ok = items.filter(x => x.src || O.picCache[x.title]?.src).sort((a, b) => a.year - b.year);
  if(!ok.length) return;
  $("d-day-sub").textContent = new Date().toLocaleDateString("en-US", {month: "long", day: "numeric"}) + " in years past";
  $("d-day").querySelector(".body").innerHTML = O.strip(ok, x => `${verb[x.kind]} ${x.year}`);
  $("d-day").hidden = !$("d-day").querySelector(".poster");
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
const shown = () => new Promise(ok => {
  if(!document.body.classList.contains("on") && !params.get("t") && !params.get("q")) return ok();
  const mo = new MutationObserver(() => { if(!document.body.classList.contains("on")){ mo.disconnect(); ok(); } });
  mo.observe(document.body, {attributes: true, attributeFilter: ["class"]});
});
(async () => {
  showTrail();
  await shown();
  $("d-shuffle").onclick = () => O.go(WALL[Math.floor(Math.random() * WALL.length)]);
  hero(D.rng("ob-hero-" + D.today()));
  wall();
  const todays = objectOfDay();
  tonight();
  launches();
  scaleWalk();
  onThisDay();
  /* Drift starts from what the reader asked for (?drift=Q…&k=object|mission&name=Title), or from today's object */
  let start = null;
  if(params.get("drift") && params.get("name")){
    const t = params.get("name"), s = await O.summary(t).catch(() => null);
    start = nodeOf(params.get("drift"), t, t, s?.thumbnail?.source || "", params.get("k") === "mission" ? "mission" : "object", s?.description ? O.cap(s.description) : "");
    setTimeout(() => $("d-drift").scrollIntoView({behavior: "smooth"}), 600);
  }
  /* otherwise from a world spacecraft have been to (a far galaxy would be a dead end), the same one for everyone today */
  if(!start){ await todays; start = await resolve(VISITED[Math.floor(D.rng("ob-drift-" + D.today())() * VISITED.length)]) || await resolve("Saturn"); }
  if(!start) return;
  $("d-drift").hidden = false;
  D.drift($("d-drift").querySelector(".body"), {start, next: threads,
    restart: async () => (await resolve(VISITED[Math.floor(Math.random() * VISITED.length)])) || start,
    visit: n => { D.trail.add({wing: "observatory", title: n.title, name: n.name, img: n.img}); showTrail(); }});
})();
}
