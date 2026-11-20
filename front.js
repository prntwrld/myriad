/* Myriad — the front page as a gallery: one wide picture of the day, and a picture on every wing.
   Picks are seeded by the date, so everyone sees the same ones today and new ones tomorrow.
   Pictures are each Wikipedia article's lead image; the pools below are chosen for how they look. */
{
const {WINGS, esc, topicIn} = window.Myriad, D = window.Myriad.discover;
const $ = id => document.getElementById(id);

/* the picture of the day: wide, quiet, monumental subjects that hold up as a letterboxed frame */
const HERO = [
  ["Salk Institute","gallery"],["Barbican Estate","gallery"],["Pantheon, Rome","gallery"],["Fallingwater","gallery"],["Habitat 67","gallery"],
  ["Parthenon","gallery"],["Unité d'habitation","gallery"],["Sydney Opera House","gallery"],["National Assembly Building of Bangladesh","gallery"],
  ["The Great Wave off Kanagawa","gallery"],["Wanderer above the Sea of Fog","gallery"],["Nighthawks (Hopper)","gallery"],
  ["Pillars of Creation","observatory"],["Earthrise","observatory"],["Carina Nebula","observatory"],["Andromeda Galaxy","observatory"],
  ["Saturn","observatory"],["Crab Nebula","observatory"],["Horsehead Nebula","observatory"],
  ["Mount Rainier","field-guide"],["Hoh Rainforest","field-guide"],["Monument Valley","field-guide"],["Antelope Canyon","field-guide"],
  ["Giant's Causeway","field-guide"],["Olympic National Park","field-guide"],
  ["Long Room","academy"],["Stockholm Public Library","academy"],["Antikythera mechanism","academy"],["Library of Celsus","academy"]
];
/* each wing's card: a wide picture, or for posters, covers and box art, one framed on a blur of its own colours */
const CARD = {
  "field-guide": {wide: ["Orca","Bald eagle","Snowy owl","Western redcedar","Great blue heron","Roosevelt elk","Monarch butterfly","Giant sequoia"]},
  "cinema":      {strip: ["Blade Runner 2049","Dune (2021 film)","Arrival (film)","2001: A Space Odyssey (film)","The Grand Budapest Hotel","Stalker (1979 film)",
                          "Metropolis (1927 film)","Playtime","Moonlight (2016 film)","In the Mood for Love","Paris, Texas (film)","Sicario (2015 film)"]},
  "metronome":   {strip: ["Kind of Blue","Blue (Joni Mitchell album)","Unknown Pleasures","Music for Airports","Selected Ambient Works 85–92","Dive (Tycho album)",
                          "OK Computer","A Love Supreme","Pet Sounds","Remain in Light","Homogenic","Kid A"]},
  "gallery":     {wide: ["Guggenheim Museum Bilbao","Seagram Building","Chrysler Building","Notre-Dame de Paris","Villa Savoye","Taj Mahal","Hagia Sophia",
                          "The Starry Night","Girl with a Pearl Earring","Las Meninas"]},
  "observatory": {wide: ["Jupiter","Orion Nebula","Ring Nebula","Whirlpool Galaxy","Milky Way","Moon","Mars","Pale Blue Dot"]},
  "academy":     {wide: ["Bodleian Library","Library of Alexandria","Difference engine","Enigma machine","Institute for Advanced Study","Bletchley Park"]},
  "arcade":      {strip: ["Myst","Shadow of the Colossus","Journey (2012 video game)","The Legend of Zelda: Ocarina of Time","Tetris","Portal (video game)",
                          "Outer Wilds","Ico (video game)","Half-Life (video game)","Super Mario 64","Hollow Knight","Return of the Obra Dinn"]}
};

const r = D.rng("front-" + D.today());
const takeN = (list, n) => { const pool = [...list], out = []; while(out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out; };
const wingOf = id => WINGS.find(w => w.id === id);
/* a link to a topic: inside its wing if the wing has its own pages, else on the main page */
const linkTo = (t, w) => w?.ready ? `href="${esc(topicIn(w, t))}"` : `href="?t=${encodeURIComponent(t)}" data-go="${esc(t)}"`;
const short = t => t.replace(/ \((\d{4} )?(film|video game|album|Tycho album|Joni Mitchell album|Hopper)\)$/, "");

/* the lead pictures and one-line descriptions of some articles, in one request */
async function pics(titles, size){
  const url = "https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=pageimages|description&piprop=thumbnail"
    + `&pithumbsize=${size}&pilicense=any&redirects=1&titles=` + encodeURIComponent(titles.join("|"));
  const j = await fetch(url, {signal: AbortSignal.timeout(12000)}).then(x => x.ok ? x.json() : null).catch(() => null);
  const back = {}, out = {};
  for(const m of [...(j?.query?.normalized || []), ...(j?.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
  for(const p of Object.values(j?.query?.pages || {})) out[back[p.title] || p.title] = {src: p.thumbnail?.source || "", desc: p.description || ""};
  return out;
}

/* ---------- the picture of the day ---------- */
const hero = document.createElement("section");
hero.className = "section today-pic"; hero.id = "todaypic"; hero.hidden = true;
$("home").prepend(hero);
let heroList = takeN(HERO, HERO.length);   /* today's order; the first is today's picture, the rest are "another" */
let heroAt = 0, shown = 0;
async function showHero(){
  for(let tries = 0; tries < 4 && heroAt < heroList.length; tries++, heroAt++){
    const [t, wid] = heroList[heroAt], w = wingOf(wid);
    const got = (await pics([t], 1800))[t];
    if(!got?.src) continue;
    const img = new Image(); img.alt = "";
    await new Promise(ok => { img.onload = ok; img.onerror = ok; img.src = got.src; });
    if(!img.naturalWidth) continue;
    hero.innerHTML = `<a class="tp-frame" ${linkTo(t, w)}></a>
      <div class="tp-placard">
        <p class="tp-kicker">${shown ? "Another" : "Today"}${w ? ` · <span style="--c:var(--c-${w.id})"><i aria-hidden="true"></i>${esc(w.name)}</span>` : ""}</p>
        <h2 class="tp-title"><a ${linkTo(t, w)}>${esc(short(t).replace(/,.*$/, ""))}</a></h2>
        ${got.desc ? `<p class="tp-desc">${esc(got.desc[0].toUpperCase() + got.desc.slice(1))}</p>` : ""}
        <p class="tp-ctl"><a class="tp-open" ${linkTo(t, w)}>Open it</a><button type="button" class="linkish" id="tp-next">Show me another</button></p>
      </div>`;
    hero.querySelector(".tp-frame").append(img);
    hero.hidden = false; shown++;
    $("tp-next").onclick = () => { heroAt++; showHero(); };
    return;
  }
}
showHero();

/* ---------- a picture on every wing card ---------- */
(async () => {
  const want = {};
  for(const w of WINGS){ const c = CARD[w.id]; if(c) want[w.id] = c.strip ? takeN(c.strip, 3) : takeN(c.wide, 3); }
  const got = await pics(Object.values(want).flat(), 640);
  for(const w of WINGS){
    const card = document.querySelector(`#wingcards .wing-card[style*="--c-${w.id})"]`), c = CARD[w.id];
    if(!card || !want[w.id]) continue;
    const ok = want[w.id].filter(t => got[t]?.src);
    if(!ok.length) continue;
    const t0 = ok[0], src0 = esc(got[t0].src);
    const html = c.strip
      ? `<a class="wc-pic framed" ${linkTo(t0, w)} title="${esc(short(t0))}"><span class="bg" style="background-image:url('${src0}')"></span><img src="${src0}" alt="" loading="lazy"><span class="wc-cap">${esc(short(t0))}</span></a>`
      : `<a class="wc-pic wide" ${linkTo(ok[0], w)} title="${esc(short(ok[0]))}"><img src="${esc(got[ok[0]].src)}" alt="" loading="lazy"><span class="wc-cap">${esc(short(ok[0]))}</span></a>`;
    card.insertAdjacentHTML("afterbegin", html);
  }
})();
}
