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
  {id:"metronome", name:"Metronome", line:"Music to discover: records, artists, scenes, and what to play next.",
    try:["Kind of Blue","Joni Mitchell","Krautrock"]},
  {id:"observatory", name:"Observatory", line:"Space: planets, stars, missions, and what's in tonight's sky.",
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
  "metronome": c => any(vals(c,"P31"), ["Q215380","Q5741069","Q482994","Q7366","Q134556","Q188451"]) ||
    any(vals(c,"P106"), ["Q639669","Q177220","Q36834","Q488205","Q2252262","Q753110","Q855091","Q486748","Q130857","Q183945"]) ||
    (!vals(c,"P31").includes("Q5") && (has(c,"P434") || has(c,"P436"))),
  "observatory": c => has(c,"P59") || has(c,"P397") || has(c,"P2583") || has(c,"P1096") ||
    any(vals(c,"P31"), ["Q634","Q523","Q318","Q42372","Q26529","Q2537","Q44559","Q8928","Q3559","Q3863","Q40218"]) ||
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
  "field-guide": c => !vals(c,"P31").includes("Q5") && (has(c,"P225") || has(c,"P3151") || any(vals(c,"P31"), ["Q16521","Q55983715"]))
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

window.Myriad = {ROOT, WINGS, ALL_WINGS, TELESCOPE, wingsFor, takeover, topicIn, esc};
}
