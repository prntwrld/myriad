/* Myriad — Cinema's front page as a place to discover, not just search:
   a double feature of the day, Drift, on this day, a door by decade and country, shuffle, and your trail.
   The slow questions are answered ahead of time in data.json (see tools/build_cinema_data.py);
   the quick ones (a film's people, a person's films) are asked of Wikidata live, as you drift. */
{
const {ROOT, esc, WINGS, topicIn, discover: D} = window.Myriad;
const C = window.Cinema;
const $ = id => document.getElementById(id);
const here = t => `./?t=${encodeURIComponent(t)}`;
const ext = `target="_blank" rel="noopener"`;
const strip = t => t.replace(/ \((\d{4} )?(\w+ )?film\)$/, "");
const FILM = "wd:Q11424";
const METRONOME = WINGS.find(w => w.id === "metronome");
const ROLE_WHY = {
  toPerson: {dir: "directed by", dop: "shot by", mus: "music by", wri: "written by", cast: "starring", edi: "edited by"},
  toFilm: {dir: "who also directed", dop: "who also shot", mus: "who also scored", wri: "who also wrote", cast: "who also appears in", edi: "who also edited"}
};

/* A canon to start from when the data file isn't there yet: well-known films from many places and decades
   (English Wikipedia titles). The data file, when present, widens this to thousands. */
const CANON = ["Breathless (1960 film)","The 400 Blows","Cléo from 5 to 7","Jules and Jim","Pierrot le Fou","Hiroshima mon amour","Last Year at Marienbad",
  "La Haine","Amélie","The Umbrellas of Cherbourg","Playtime","Mon Oncle","The Rules of the Game","Grand Illusion","Children of Paradise","Beauty and the Beast (1946 film)",
  "Au revoir les enfants","Three Colours: Blue","Portrait of a Lady on Fire","Seven Samurai","Rashomon","Ikiru","Tokyo Story","Late Spring","Ugetsu",
  "Woman in the Dunes","Harakiri (1962 film)","Spirited Away","My Neighbor Totoro","Ran (film)","Tampopo","Bicycle Thieves","Rome, Open City","La Strada",
  "8½","La Dolce Vita","L'Avventura","The Leopard (1963 film)","Cinema Paradiso","The Conformist (film)","Il Postino: The Postman","Persona (1966 film)",
  "The Seventh Seal","Wild Strawberries (film)","Fanny and Alexander","Metropolis (1927 film)","Nosferatu","The Cabinet of Dr. Caligari","M (1931 film)",
  "Wings of Desire","Fitzcarraldo","Aguirre, the Wrath of God","Run Lola Run","The Lives of Others","Battleship Potemkin","Man with a Movie Camera",
  "Stalker (1979 film)","Andrei Rublev (film)","Solaris (1972 film)","Come and See","The Cranes Are Flying","Ivan's Childhood","Pather Panchali",
  "Charulata","Close-Up (1990 film)","Taste of Cherry","A Separation","In the Mood for Love","Chungking Express","Farewell My Concubine (film)",
  "Raise the Red Lantern","Yi Yi","A City of Sadness","Oldboy (2003 film)","Parasite (2019 film)","Memories of Murder","Black Girl (film)",
  "Touki Bouki","City of God (2002 film)","Black Orpheus","Amores perros","Los Olvidados","Roma (2018 film)","The Battle of Algiers","Ashes and Diamonds (film)",
  "Knife in the Water","Closely Watched Trains","The Shop on Main Street","Daisies (1966 film)","Citizen Kane","Casablanca (film)","Sunset Boulevard (film)",
  "Vertigo (film)","Rear Window","Psycho (1960 film)","Singin' in the Rain","Some Like It Hot","The Night of the Hunter (film)","Touch of Evil",
  "The Apartment","2001: A Space Odyssey (film)","Taxi Driver","The Godfather","Chinatown (1974 film)","Annie Hall","Do the Right Thing",
  "Pulp Fiction","Mulholland Drive (film)","Moonlight (2016 film)","Sunrise: A Song of Two Humans","City Lights","Modern Times (film)","The General (1926 film)",
  "Sherlock Jr.","The Passion of Joan of Arc","The Third Man","Brief Encounter","Black Narcissus (film)","Lawrence of Arabia (film)","Kes (film)","Don't Look Now",
  "Paris, Texas (film)","Days of Heaven","Badlands (film)","The Red Shoes (1948 film)","Late Autumn (1960 film)","Beau Travail","Jeanne Dielman, 23 quai du Commerce, 1080 Bruxelles"];

/* the Wikidata item and year for a few Wikipedia titles, in one quick request */
async function resolve(titles){
  const j = await C.getJSON("https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&titles="
    + encodeURIComponent(titles.join("|")));
  const back = {}; for(const m of [...(j.query?.normalized || []), ...(j.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
  return Object.values(j.query?.pages || {}).filter(p => p.pageprops?.wikibase_item)
    .map(p => ({id: p.pageprops.wikibase_item, enwiki: p.title, name: strip(p.title), year: "", archive: "", asked: back[p.title] || p.title}));
}

/* ---------- the data made ahead of time ---------- */
let DATA = null;
const data = () => DATA ||= fetch("data.json?v=" + (document.querySelector('script[src*="landing.js"]')?.src.split("v=")[1] || "1"))
  .then(r => r.ok ? r.json() : null).then(j => {
    if(!j) return null;
    const F = j.filmFields, P = j.peopleFields;
    j.films = j.films.map(a => Object.fromEntries(F.map((k, i) => [k, a[i]])));
    j.people = j.people.map(a => Object.fromEntries(P.map((k, i) => [k, a[i]])));
    j.films.forEach(f => f.name = f.enwiki ? strip(f.enwiki) : f.label);
    return j;
  }).catch(() => null);

/* a film as a poster card (the poster comes from its Wikipedia article) */
const card = f => `<a class="poster" href="${esc(f.enwiki ? here(f.enwiki) : "https://www.wikidata.org/wiki/" + f.id)}"${f.enwiki ? "" : ` ${ext}`}>
  <div class="frame">${C.posterCache[f.enwiki] ? `<img src="${esc(C.posterCache[f.enwiki])}" alt="" data-t="${esc(f.name)}">` : `<span class="cover">${esc(f.name)}</span>`}</div>
  <div class="cap"><span class="t">${esc(f.name)}</span><span class="y">${f.year || ""}${f.archive ? ` · <b class="free">free to watch</b>` : ""}</span></div></a>`;
const strip_ = async (el, films) => {
  el.innerHTML = films.map(card).join("");
  await C.posters(films.map(f => f.enwiki));
  el.innerHTML = films.map(card).join("");
};

/* ---------- the page ---------- */
const box = document.createElement("div");
box.id = "discover";
box.innerHTML = `
  <section class="section" id="d-today" hidden><h2 class="label">Tonight's double feature</h2><p class="sub" id="d-today-sub"></p><div class="body"></div></section>
  <section class="section" id="d-drift"><h2 class="label">Drift</h2><p class="sub">Pull a thread — from a film to the people who made it, and on to what else they made</p><div class="body"><p class="status">Getting ready…</p></div></section>
  <section class="section" id="d-day" hidden><h2 class="label">On this day</h2><p class="sub" id="d-day-sub"></p><div class="body"></div></section>
  <section class="section" id="d-door" hidden><h2 class="label">Open a door</h2><p class="sub">Pick a decade and a country</p><div class="body"></div></section>
  <section class="section" id="d-trail" hidden><h2 class="label">Your collection</h2><p class="sub"><span id="d-count"></span> — kept only in this browser <button type="button" class="linkish small" id="d-clear">Clear</button></p><div class="body"></div></section>`;
$("main").prepend(box);
/* a Shuffle button beside the search box */
$("chips").insertAdjacentHTML("afterbegin", `<button type="button" class="shuffle" id="d-shuffle" title="Open a well-known film at random">Shuffle</button>`);

/* ---------- Drift: film → person → film… ---------- */
const filmNode = (id, title, name, year) => ({key: id, kind: "film", id, name: name || strip(title), title, href: here(title), sub: year ? String(year) : "",
  img: C.posterCache[title] || ""});
async function withPoster(n){ if(n.kind === "film" && !n.img){ await C.posters([n.title]); n.img = C.posterCache[n.title] || ""; } return n; }
async function fromFilm(n){
  const rows = await C.sparql(`SELECT ?x ?xLabel ?r (MAX(?sl) AS ?pop) (SAMPLE(?img) AS ?pic) (SAMPLE(?art) AS ?a) WHERE {
    VALUES (?p ?r) { (wdt:P57 "dir") (wdt:P344 "dop") (wdt:P86 "mus") (wdt:P58 "wri") (wdt:P161 "cast") (wdt:P1040 "edi") }
    wd:${n.id} ?p ?x . ?x wikibase:sitelinks ?sl . ?art schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> .
    OPTIONAL { ?x wdt:P18 ?img }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } GROUP BY ?x ?xLabel ?r ORDER BY DESC(?pop) LIMIT 30`);
  /* the crew make more surprising steps than the stars, so weigh them up; and step to people
     Wikipedia knows well (with a face to show) rather than the twelfth name on the cast list */
  const boost = {dop: 3, mus: 3, wri: 2, edi: 2, dir: 2.5, cast: 0.6};
  const cands = rows.map(r => ({r: r.r, node: {key: C.qid(r.x), kind: "person", id: C.qid(r.x), name: C.label(r, "x") || C.artTitle(r.a), title: C.artTitle(r.a),
      href: here(C.artTitle(r.a)), img: r.pic ? C.commons(r.pic, 300) : "", sub: "",
      /* a link onward to Metronome only when the step itself is musical ("music by"): Wikidata lists side careers
         (a director who once played in a band), and those shouldn't send you to the music wing */
      chips: r.r === "mus" && METRONOME ? [{wing: METRONOME, href: topicIn(METRONOME, C.artTitle(r.a))}] : []},
      w: Math.sqrt(+r.pop) * (boost[r.r] || 1) * (r.pic ? 1 : 0.35)}))
    .filter(c => c.node.name && +rows.find(r => C.qid(r.x) === c.node.id).pop >= 8);
  const out = []; while(cands.length){ const c = D.pick(cands, x => x.w); cands.splice(cands.indexOf(c), 1); out.push({node: c.node, why: ROLE_WHY.toPerson[c.r] || "with"}); }
  return out;
}
async function fromPerson(n){
  const rows = await C.sparql(`SELECT ?f ?fLabel ?r (MIN(YEAR(?d)) AS ?y) (MAX(?sl) AS ?pop) (SAMPLE(?art) AS ?a) WHERE {
    VALUES (?p ?r) { (wdt:P57 "dir") (wdt:P344 "dop") (wdt:P86 "mus") (wdt:P58 "wri") (wdt:P161 "cast") (wdt:P1040 "edi") }
    ?f ?p wd:${n.id} . FILTER EXISTS { ?f wdt:P31/wdt:P279? ${FILM} } ?f wikibase:sitelinks ?sl .
    ?art schema:about ?f ; schema:isPartOf <https://en.wikipedia.org/> . OPTIONAL { ?f wdt:P577 ?d }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } GROUP BY ?f ?fLabel ?r ORDER BY DESC(?pop) LIMIT 24`);
  const cands = rows.map(r => ({r: r.r, node: filmNode(C.qid(r.f), C.artTitle(r.a), "", r.y), w: Math.sqrt(+r.pop)}));
  const out = []; while(cands.length){ const c = D.pick(cands, x => x.w); cands.splice(cands.indexOf(c), 1); out.push({node: c.node, why: ROLE_WHY.toFilm[c.r] || "and"}); }
  await C.posters(out.slice(0, 12).map(c => c.node.title)); out.forEach(c => c.node.img = C.posterCache[c.node.title] || "");
  return out;
}
/* a well-known film at random (or by the day's seed): from the data file if it's there, else from the canon */
async function wellKnown(j, r = Math.random){
  if(j) return D.pick(j.films.filter(f => f.enwiki && f.wikipedias >= 40), f => f.wikipedias, r);
  const t = CANON[Math.floor(r() * CANON.length)];
  return (await resolve([t]))[0] || (await resolve(["Breathless (1960 film)"]))[0];
}

/* ---------- Tonight's double feature: a film of the day, and another that shares someone with it ---------- */
async function doubleFeature(j){
  const cached = D.daily.get("cinema-double");
  if(cached) return cached;
  const r = D.rng("cinema-double-" + D.today());
  for(let tries = 0; tries < 8; tries++){
    const a = await wellKnown(j, r);
    const rows = await C.sparql(`SELECT ?b ?r ?x ?xLabel (MAX(?sl) AS ?pop) (SAMPLE(?art) AS ?ab) WHERE {
      VALUES (?p ?r) { (wdt:P344 "dop") (wdt:P86 "mus") (wdt:P58 "wri") (wdt:P161 "cast") }
      wd:${a.id} ?p ?x . ?b ?p ?x . FILTER(?b != wd:${a.id}) FILTER EXISTS { ?b wdt:P31/wdt:P279? ${FILM} }
      FILTER NOT EXISTS { wd:${a.id} wdt:P57 ?d . ?b wdt:P57 ?d }
      ?b wikibase:sitelinks ?sl . FILTER(?sl > 15) ?art schema:about ?b ; schema:isPartOf <https://en.wikipedia.org/> .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } GROUP BY ?b ?r ?x ?xLabel ORDER BY (?r = "cast") DESC(?pop) LIMIT 60`).catch(() => []);
    /* the crew make the best reasons (a shared cinematographer says more than a shared star), so the first
       tries insist on one; and the partner should be a discovery — known enough to find, not the obvious hit */
    const rank = {dop: 0, mus: 1, wri: 2, cast: 3};
    const best = rows.filter(x => C.label(x, "x") && (tries >= 5 || x.r !== "cast")).sort((x, y) => rank[x.r] - rank[y.r]);
    if(!best.length) continue;
    const tier = best.filter(x => x.r === best[0].r);
    const fresh = tier.filter(x => +x.pop >= 15 && +x.pop <= 60);
    const from = fresh.length ? fresh : tier;
    const b = from[Math.floor(r() * Math.min(from.length, 8))];
    const film = j?.films.find(f => f.id === C.qid(b.b));
    const pair = {a, b: {id: C.qid(b.b), enwiki: C.artTitle(b.ab), name: strip(C.artTitle(b.ab)), year: film?.year || "", archive: film?.archive || ""},
      why: ROLES[b.r].why, role: b.r, who: C.label(b, "x"), whoId: C.qid(b.x)};
    D.daily.set("cinema-double", pair);
    return pair;
  }
  return null;
}

/* the person who joins the pair — their face and a line about them — and when each film came out */
const ROLES = {dop: {why: "Same cinematographer", verb: "shot"}, mus: {why: "Same composer", verb: "scored"},
  wri: {why: "Same writer", verb: "wrote"}, cast: {why: "Same face on screen", verb: "is in"}};
async function about(pair){
  if(pair.info) return;
  try {
    const [r] = await C.sparql(`SELECT (SAMPLE(?d) AS ?desc) (SAMPLE(?i) AS ?img) (MIN(YEAR(?da)) AS ?ya) (MIN(YEAR(?db)) AS ?yb) WHERE {
      OPTIONAL { wd:${pair.whoId} schema:description ?d . FILTER(LANG(?d) = "en") }
      OPTIONAL { wd:${pair.whoId} wdt:P18 ?i }
      OPTIONAL { wd:${pair.a.id} wdt:P577 ?da } OPTIONAL { wd:${pair.b.id} wdt:P577 ?db } }`);
    pair.info = {desc: r?.desc || "", img: r?.img ? C.commons(r.img, 300) : "", ya: +r?.ya || 0, yb: +r?.yb || 0};
    D.daily.set("cinema-double", pair);
  } catch(e){ pair.info = {}; }
}

/* ---------- On this day ---------- */
function onThisDay(j){
  const md = D.monthDay();
  const films = j.films.filter(f => f.monthDay === md && f.enwiki).slice(0, 12);
  const people = j.people.filter(p => p.monthDay === md).slice(0, 10);
  if(!films.length && !people.length) return;
  $("d-day-sub").textContent = `${new Date().toLocaleDateString("en-US", {month: "long", day: "numeric"})}: films first released and film people born on this date`;
  const sec = $("d-day"); sec.hidden = false;
  sec.querySelector(".body").innerHTML = (films.length ? `<h3 class="minor">Released today</h3><div class="wall strip" id="d-day-films"></div>` : "")
    + (people.length ? `<h3 class="minor">Born today</h3><div class="faces">${people.map(p => `<a class="face" href="${esc(here(p.enwiki))}"><div class="ph">${p.commonsImage
      ? `<img src="${esc(C.commons("http://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(p.commonsImage), 240))}" alt="" loading="lazy">`
      : `<span class="initials">${esc(p.enwiki.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span>`}</div>
      <div class="cap"><span class="t">${esc(p.enwiki.replace(/ \(.*\)$/, ""))}</span><span class="y">born ${p.born}</span></div></a>`).join("")}</div>` : "");
  if(films.length) strip_($("d-day-films"), films.map(f => ({...f, name: `${f.name}`})));
}

/* ---------- Open a door: a decade and a country ---------- */
function door(j){
  const decades = [...new Set(j.films.map(f => Math.floor(f.year / 10) * 10))].filter(d => d >= 1890 && d <= 2020).sort();
  const countries = Object.entries(j.countries).sort((a, b) => a[1][0].localeCompare(b[1][0]));
  /* start on a door chosen by the day: a decade and country with plenty behind it */
  const r = D.rng("cinema-door-" + D.today());
  const combos = [];
  for(const [c] of countries) for(const d of decades){ const n = j.films.filter(f => f.year >= d && f.year < d + 10 && f.countries.includes(c)).length; if(n >= 8 && d <= 2000) combos.push([d, c, n]); }
  const [d0, c0] = combos.length ? D.pick(combos, x => Math.sqrt(x[2]), r) : [1960, ""];
  const sec = $("d-door"); sec.hidden = false;
  sec.querySelector(".body").innerHTML = `<div class="door-ctl">
      <label>Decade <select id="d-dec">${decades.map(d => `<option value="${d}"${d === d0 ? " selected" : ""}>${d}s</option>`).join("")}</select></label>
      <label>Country <select id="d-cty"><option value="">Anywhere</option>${countries.map(([q, [n]]) => `<option value="${q}"${q === c0 ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <button type="button" class="ghost" id="d-door-rnd">Any door</button></div>
    <p class="chart-note" id="d-door-note"></p><div class="wall strip" id="d-door-films"></div>`;
  const show = () => {
    const d = +$("d-dec").value, c = $("d-cty").value;
    const films = j.films.filter(f => f.year >= d && f.year < d + 10 && (!c || f.countries.includes(c)) && f.enwiki).slice(0, 18).sort((a, b) => a.year - b.year);
    $("d-door-note").textContent = films.length ? `The best-known films${c ? " from " + j.countries[c][0] : ""} of the ${d}s, in order` : "Nothing well known behind this door — try another.";
    strip_($("d-door-films"), films);
  };
  sec.addEventListener("change", show);
  $("d-door-rnd").onclick = () => { const [d, c] = D.pick(combos, x => Math.sqrt(x[2])); $("d-dec").value = d; $("d-cty").value = c; show(); };
  show();
}

/* ---------- Your trail ---------- */
function showTrail(){
  const html = D.trail.html(16), sec = $("d-trail");
  sec.hidden = !html; sec.querySelector(".body").innerHTML = html;
  const n = D.trail.count(); $("d-count").textContent = `${n} ${n === 1 ? "entry" : "entries"} found`;
}
$("d-clear").onclick = () => { D.trail.clear(); showTrail(); };

/* ---------- start ---------- */
const params = new URLSearchParams(location.search);
let walker = null;
(async () => {
  showTrail();
  const j = await data();   /* may be null: then the canon stands in, and the sections that need the file stay hidden */
  $("d-shuffle").onclick = async () => { const f = await wellKnown(j); if(f) location.href = here(f.enwiki); };
  if(j){ onThisDay(j); door(j); }

  /* Drift starts from a film or person the reader asked for (?drift=Q…&k=film|person&name=Title), or from today's film */
  const startFrom = async () => {
    const f = await wellKnown(j); return withPoster(filmNode(f.id, f.enwiki, f.name, f.year));
  };
  let start;
  if(params.get("drift") && params.get("name")){
    const t = params.get("name");
    start = params.get("k") === "person" ? {key: params.get("drift"), kind: "person", id: params.get("drift"), name: t.replace(/ \(.*\)$/, ""), title: t, href: here(t), img: params.get("img") || "", sub: ""}
      : await withPoster(filmNode(params.get("drift"), t, "", ""));
    setTimeout(() => $("d-drift").scrollIntoView({behavior: "smooth"}), 300);
  }

  const pair = await doubleFeature(j);
  if(pair){
    const sec = $("d-today"); sec.hidden = false;
    $("d-today-sub").textContent = new Date().toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric"}) + " — a new pair every day";
    await Promise.all([C.posters([pair.a.enwiki, pair.b.enwiki]), about(pair)]);
    const one = f => `<div class="df-film">${card(f)}${f.archive ? `<a class="df-play" href="${esc(here(f.enwiki))}">▶ Watch it free</a>` : ""}</div>`;
    const R = ROLES[pair.role] || ROLES.cast, i = pair.info || {};
    const gap = i.ya && i.yb ? Math.abs(i.ya - i.yb) : null;
    const when = gap === null ? "" : gap === 0 ? ", the same year" : gap === 1 ? ", a year apart" : `, ${gap} years apart`;
    sec.querySelector(".body").innerHTML = `<div class="double">${one(pair.a)}
      <div class="df-why">
        <a class="df-face" href="${esc(here(pair.who))}">${i.img ? `<img src="${esc(i.img)}" alt="">` : `<span>${esc(pair.who.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span>`}</a>
        <p class="df-role">${esc(pair.why)}</p>
        <p class="df-story"><a href="${esc(here(pair.who))}">${esc(pair.who)}</a> ${esc(R.verb)} both${esc(when)}.</p>
        ${i.desc ? `<p class="df-desc">${esc(i.desc[0].toUpperCase() + i.desc.slice(1))}</p>` : ""}
        <button type="button" class="df-drift" id="df-drift">Drift from ${esc(pair.who.split(" ").slice(-1)[0])} →</button>
      </div>${one(pair.b)}</div>`;
    $("df-drift").onclick = () => {
      walker?.begin({key: pair.whoId, kind: "person", id: pair.whoId, name: pair.who, title: pair.who, href: here(pair.who), img: i.img || "", sub: i.desc || ""});
      $("d-drift").scrollIntoView({behavior: "smooth", block: "start"});
    };
    if(!start) start = await withPoster(filmNode(pair.a.id, pair.a.enwiki, pair.a.name, pair.a.year));
  }
  if(!start) start = await startFrom();
  walker = D.drift($("d-drift").querySelector(".body"), {start, next: n => n.kind === "film" ? fromFilm(n) : fromPerson(n), restart: startFrom});
})();
}
