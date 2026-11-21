/* Myriad — shared by every page: the wings, the nav bar, and the theme switch.
   Load it as the first thing inside <body>; it writes the nav bar in place, so there is no flash. */
{
const ROOT = new URL(".", document.currentScript.src).href;

/* The wings. Each is a specialist room with its own accent colour (set in style.css as --c-<id>). */
const ALL_WINGS = [
  {id:"academy", name:"Academy", parked:true, line:"Scholarship: papers, authors, citations, and the frontier of AI research.",
    try:["Claude Shannon","Information theory","Transformer (deep learning)"]},
  {id:"arcade", name:"Arcade", line:"Video games: history, platforms, makers, and old games you can play in the browser.",
    try:["Myst","Shadow of the Colossus","Tetris"]},
  {id:"cinema", name:"Cinema", ready:true, line:"Films and filmmakers: filmographies, collaborators, movements, and where to watch.",
    try:["Jean-Luc Godard","Breathless (1960 film)","French New Wave"]},
  {id:"field-guide", name:"Field Guide", ready:true, line:"Birds, beasts, plants and fungi: how to know them, where to find them, what they sound like.",
    try:["Steller's jay","Western redcedar","Orca"]},
  {id:"gallery", name:"Gallery", line:"Art and architecture: paintings, buildings, the people who made them, and the movements they made.",
    try:["Fallingwater","Hokusai","Art Nouveau"]},
  {id:"metronome", name:"Metronome", ready:true, line:"Music to discover: records, artists, scenes, and what to play next.",
    try:["Kind of Blue","Joni Mitchell","Krautrock"]},
  {id:"observatory", name:"Observatory", ready:true, line:"Space: planets, stars, missions, and what's in tonight's sky.",
    try:["Saturn","Andromeda Galaxy","Voyager 1"]}
];
/* a parked wing keeps its page (and its folder) but leaves the nav, the front page and topic links until it's ready */
const WINGS = ALL_WINGS.filter(w => !w.parked);
const TELESCOPE = "https://prntwrld.github.io/telescope/";

/* Which wings a topic belongs to, from its Wikidata claims.
   Mostly by which catalogues know it (a MusicBrainz ID means music), then by what it is or what the person did. */
const has = (c, p) => !!c[p]?.length;
const vals = (c, p) => (c[p] || []).map(x => x.mainsnak?.datavalue?.value?.id).filter(Boolean);
const any = (list, set) => list.some(q => set.includes(q));
const RULES = {
  "field-guide": c => has(c,"P225") || has(c,"P171"),
  "cinema": c => has(c,"P4947") || has(c,"P1258") || any(vals(c,"P31"), ["Q11424","Q24869","Q202866","Q93204","Q5398426","Q3001152","Q201658"]) ||
    any(vals(c,"P106"), ["Q2526255","Q3455803","Q28389","Q222344","Q7042855","Q10800557","Q33999"]),
  /* MusicBrainz lists anyone with a credit (Godard has one), so a person counts only if music is their work */
  "metronome": c => any(vals(c,"P31"), ["Q215380","Q5741069","Q482994","Q7366","Q134556","Q188451","Q18127","Q208569","Q209939","Q169930"]) || has(c,"P966") || has(c,"P8052") ||
    any(vals(c,"P106"), ["Q639669","Q177220","Q36834","Q488205","Q2252262","Q753110","Q855091","Q486748","Q130857","Q183945"]) ||
    (!vals(c,"P31").includes("Q5") && (has(c,"P434") || has(c,"P436"))),
  "observatory": c => has(c,"P59") || has(c,"P397") || has(c,"P2583") || has(c,"P1096") || has(c,"P619") || has(c,"P6257") ||
    any(vals(c,"P31"), ["Q634","Q523","Q318","Q42372","Q26529","Q2537","Q44559","Q8928","Q3559","Q3863","Q40218","Q148578","Q752783","Q2133344","Q18819669"]) ||
    any(vals(c,"P106"), ["Q11631","Q11063"]),
  "academy": c => any(vals(c,"P31"), ["Q13442814","Q11862829","Q2267705"]) ||
    any(vals(c,"P106"), ["Q901","Q169470","Q170790","Q4964182","Q1650915","Q82594","Q593644","Q864503","Q1622272","Q2374149"]),
  "gallery": c => any(vals(c,"P31"), ["Q3305213","Q860861","Q838948","Q968159","Q32880","Q93184","Q125191"]) ||
    has(c,"P84") || has(c,"P149") || (has(c,"P170") && has(c,"P186")) ||
    any(vals(c,"P106"), ["Q1028181","Q1281618","Q42973","Q483501","Q33231","Q11569986","Q3391743"]),
  "arcade": c => has(c,"P1733") || has(c,"P1933") || has(c,"P2816") ||
    any(vals(c,"P31"), ["Q7889","Q7058673","Q8076","Q659563"])
};
/* a link to a topic inside a wing that has its own topic pages, or else on the main page */
const topicIn = (w, t) => w.ready ? `${ROOT}${w.id}/?t=${encodeURIComponent(t)}` : `${ROOT}?t=${encodeURIComponent(t)}`;
const wingsFor = claims => WINGS.filter(w => { try { return RULES[w.id](claims || {}); } catch(e){ return false; } });

/* When a topic plainly belongs to a wing with its own topic pages, a search on the main page goes straight there.
   Plainly: it's the wing's own kind of thing (a film), or a person whose first-listed occupation is the wing's work,
   or the only wing it fits (a film movement). An actor who is mainly a singer stays on the main page. */
const OWN = {
  /* films, film movements and film genres, and people whose first-listed work is film */
  "cinema": c => has(c,"P4947") || any(vals(c,"P31"), ["Q11424","Q24869","Q202866","Q93204","Q24862","Q226730","Q506240","Q3001152","Q201658"]) ||
    ["Q2526255","Q3455803","Q28389","Q222344","Q7042855","Q10800557","Q33999"].includes(vals(c,"P106")[0]),
  /* living things: anything with a scientific name, or that Wikidata calls a taxon; a person named after a plant stays put */
  "field-guide": c => !vals(c,"P31").includes("Q5") && (has(c,"P225") || has(c,"P3151") || any(vals(c,"P31"), ["Q16521","Q55983715"])),
  /* records, songs, bands, genres and record labels, and people whose first-listed work is music;
     an actor who also sings (first listed as an actor) stays on the main page */
  "metronome": c => has(c,"P436") || has(c,"P966") || has(c,"P8052") ||
    any(vals(c,"P31"), ["Q482994","Q208569","Q209939","Q169930","Q222910","Q134556","Q7366","Q4176708","Q188451","Q215380","Q5741069","Q2088357","Q9212979","Q2491498","Q18127"]) ||
    (!vals(c,"P31").includes("Q5") && has(c,"P434")) ||
    ["Q639669","Q177220","Q36834","Q488205","Q753110","Q855091","Q486748","Q130857","Q183945","Q158852","Q1259917","Q584301","Q1415090","Q386854",
     "Q12800682","Q806349","Q1075651","Q2252262","Q1327329","Q4351403","Q2643890"].includes(vals(c,"P106")[0]),
  /* things in the sky and the craft sent to them: anything with a launch date, a place among the stars, a body it orbits
     or a distance from Earth; a person (an astronomer, an astronaut) stays on the main page unless space is all they're known for */
  "observatory": c => !vals(c,"P31").includes("Q5") && (has(c,"P619") || has(c,"P59") || has(c,"P397") || has(c,"P2583") || has(c,"P6257") || has(c,"P1096") ||
    any(vals(c,"P31"), ["Q634","Q523","Q318","Q42372","Q26529","Q2537","Q44559","Q8928","Q3559","Q3863","Q40218","Q148578","Q752783","Q2133344","Q18819669"]))
};
const takeover = claims => {
  const ws = wingsFor(claims).filter(w => w.ready);
  return ws.find(w => OWN[w.id]?.(claims || {})) || (wingsFor(claims).length === 1 ? ws[0] : null) || null;
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const here = document.body.dataset.wing || "";

/* the nav bar: Myriad, the wings in alphabetical order (each marked with a diamond in its colour), and Télescope */
document.currentScript.insertAdjacentHTML("afterend", `<nav class="wings wrap" aria-label="Myriad and its wings">
  <a class="w-home" href="${ROOT}"${here ? "" : ` aria-current="page"`}>Myriad</a>
  ${WINGS.map(w => `<a href="${ROOT}${w.id}/" style="--c:var(--c-${w.id})"${w.id === here ? ` aria-current="page"` : ""}><i aria-hidden="true"></i>${esc(w.name)}</a>`).join("")}
  <a class="w-out" href="${TELESCOPE}" target="_blank" rel="noopener" title="Télescope — a sister site">Télescope<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></a>
</nav>`);

/* the theme switch cycles light → dark → Y2K, and remembers the choice */
const THEMES = ["light", "dark", "y2k"], THEME_NAME = {light:"Light", dark:"Dark", y2k:"Y2K"};
const theme = () => {
  const t = document.documentElement.dataset.theme;
  return THEMES.includes(t) ? t : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
};
const labelTheme = btn => {
  const now = theme(), next = THEMES[(THEMES.indexOf(now) + 1) % THEMES.length];
  btn.setAttribute("aria-label", `Theme: ${THEME_NAME[now]}. Switch to ${THEME_NAME[next]}`);
  btn.title = `Theme: ${THEME_NAME[now]} (next: ${THEME_NAME[next]})`;
};
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("theme"); if(!btn) return;
  btn.addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(theme()) + 1) % THEMES.length];
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("myriad-theme", next); } catch(e){}
    labelTheme(btn);
  });
  labelTheme(btn);
});

/* Topic pages: the words on the left (the summary, then the quick facts, whole), the picture on the right.
   When the words run longer than the picture, the right-hand column fills with a few more pictures the page offers
   (Myriad.sideFill), in whole rows, as many as fit, so no hole opens beside the words. Every page builds its topic
   header the same way (#lead beside .side), so this serves them all; on a phone the columns stack and nothing moves. */
let balancing = 0;
/* how tall a column's content is (the grid stretches both columns to the taller one, so its own height won't say) */
const contentH = (el, skip) => { const kids = [...el.children].filter(k => !k.hidden && k.offsetParent && k !== skip); return kids.length ? kids.at(-1).getBoundingClientRect().bottom - el.getBoundingClientRect().top : 0; };
const balanceHero = () => {
  const lead = document.getElementById("lead"), side = lead?.closest(".hero")?.querySelector(".side");
  if(!lead || !side) return;
  const facts = document.getElementById("facts"), wide = matchMedia("(min-width: 761px)").matches;
  /* only once the facts are filled in: until then the page may still rewrite the summary, and the facts with it */
  if(facts && !facts.hidden){
    if(wide && facts.parentElement !== lead){ lead.append(facts); facts.classList.add("in-lead"); }
    if(!wide && facts.parentElement === lead){ side.append(facts); facts.classList.remove("in-lead"); }
  }
  /* the extra pictures: whole rows of two, as many as fit beside the words */
  let box = side.querySelector(".side-fill");
  const list = side._fill || [];
  if(!wide || !list.length){ if(box){ box.remove(); document.dispatchEvent(new CustomEvent("myriad-sidefill", {detail: []})); } return; }
  if(!box){ box = document.createElement("div"); box.className = "side-fill"; side.append(box); }
  const tile = (side.clientWidth - 8) / 2, room = contentH(lead) - contentH(side, box) - 18;
  const n = Math.min(Math.max(0, Math.floor((room + 8) / (tile + 8))) * 2, Math.floor(list.length / 2) * 2);
  if(+box.dataset.n === n) return;
  box.dataset.n = n; box.hidden = !n;
  /* say which are showing, so a wall further down the page can leave them out rather than repeat them */
  document.dispatchEvent(new CustomEvent("myriad-sidefill", {detail: list.slice(0, n).map(x => x.href)}));
  box.innerHTML = list.slice(0, n).map(x => `<a href="${esc(x.href)}"${x.internal ? "" : ` target="_blank" rel="noopener"`} title="${esc(x.title || "")}"${x.name ? ` data-name="${esc(x.name)}"` : ""}${x.person ? " data-person" : ""}><img src="${esc(x.src)}" alt="" loading="lazy"></a>`).join("");
};
const reBalance = () => { cancelAnimationFrame(balancing); balancing = requestAnimationFrame(balanceHero); };
/* pictures a page offers for the space under its main picture: [{src, href, title, name?, person?, internal?}]
   (name is shown on the picture; a person's portrait is in black and white until pointed at, as elsewhere;
   internal links open in the same tab) */
const sideFill = list => { const side = document.querySelector(".hero .side"); if(side){ side._fill = list; side.querySelector(".side-fill")?.remove(); reBalance(); } };
/* the summary, the picture and the facts all arrive at different moments, so check whenever the page changes size */
new ResizeObserver(reBalance).observe(document.documentElement);

window.Myriad = {ROOT, WINGS, ALL_WINGS, TELESCOPE, wingsFor, takeover, topicIn, esc, sideFill};
}
