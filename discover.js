/* Myriad — discovery, shared by every wing.
   - today(): the date, so a wing's "of the day" picks are the same for everyone today and change at midnight
   - rng(seed) / pick(): seeded randomness, and a weighted pick that favours well-known things
   - trail: what this browser has wandered through, across wings (kept only in this browser)
   - drift(): the Drift walker — from one thing to a connected thing, one step at a time, saying why */
{
const {esc, WINGS} = window.Myriad;

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const monthDay = () => today().slice(5);
const hash = s => { let h = 2166136261; for(const c of String(s)){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = seed => { let a = typeof seed === "number" ? seed : hash(seed); return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
/* a weighted pick: weight(x) says how much each item should count */
const pick = (list, weight = () => 1, r = Math.random) => {
  const ws = list.map(x => Math.max(0, weight(x))), total = ws.reduce((a, b) => a + b, 0);
  let n = r() * total; for(let i = 0; i < list.length; i++){ n -= ws[i]; if(n <= 0) return list[i]; } return list[list.length - 1];
};

/* small per-browser storage that never breaks the page if storage is blocked */
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
/* remember an answer for today only (e.g. the day's double feature), so it is worked out once a day per browser */
const daily = {
  get: k => { const v = store.get("myriad-day:" + k); return v?.day === today() ? v.value : null; },
  set: (k, value) => store.set("myriad-day:" + k, {day: today(), value})
};

/* ---------- the trail: what you've looked at, across all of Myriad ---------- */
const TRAIL = "myriad-trail", TRAIL_MAX = 60;
const trail = {
  count: () => store.get(TRAIL, []).length,
  add(item){ /* {wing, title, name} */
    if(!item?.title) return;
    const list = store.get(TRAIL, []).filter(x => !(x.title === item.title && x.wing === item.wing));
    /* keep a picture already known for it if this visit didn't bring one */
    const old = store.get(TRAIL, []).find(x => x.title === item.title && x.wing === item.wing);
    list.unshift({...item, img: item.img || old?.img || "", at: Date.now()}); store.set(TRAIL, list.slice(0, TRAIL_MAX));
  },
  list: () => store.get(TRAIL, []),
  clear: () => store.set(TRAIL, []),
  html(n = 14){
    const list = trail.list().slice(0, n); if(!list.length) return "";
    return `<ol class="trail">${list.map(x => {
      const w = WINGS.find(w => w.id === x.wing);
      const href = w ? Myriad.topicIn(w, x.title) : `${Myriad.ROOT}?t=${encodeURIComponent(x.title)}`;
      const nm = x.name || x.title;
      return `<li><a href="${esc(href)}"${w ? ` style="--c:var(--c-${w.id})"` : ""}><span class="tr-img">${x.img
        ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<b>${esc(nm.split(/\s+/).map(v => v[0]).slice(0, 2).join(""))}</b>`}</span>
        <span class="tr-name">${w ? `<i aria-hidden="true"></i>` : ""}${esc(nm)}</span></a></li>`;
    }).join("")}</ol>`;
  }
};

/* ---------- Drift: a walk through connections ----------
   drift(el, {start, next, restart}) — start is a node; next(node, visited) returns [{node, why}] candidates.
   A node is {key, kind, name, href, img, sub, chips:[{wing, href}]}. "why" is the joining phrase ("shot by").
   Each step offers a few threads to pull, each saying how it connects; you pick one (or ask for a surprise),
   and the path you've walked stays along the top so you can step back to any point. */
const PER = 3;
function drift(el, opts){
  let path = [], options = null, shown = 0, msg = "", token = 0;
  const ini = n => esc((n.name || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join(""));
  const shape = n => n.kind === "person" ? "round" : "tall";
  const thumb = n => n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy">` : `<span class="dc-ini">${ini(n)}</span>`;
  const nodeCard = (n, why) => `<div class="drift-card">
      <a class="dc-img ${shape(n)}" href="${esc(n.href)}">${thumb(n)}</a>
      <div class="dc-text"><p class="dc-why">${why ? esc(why) : "Starting from"}</p>
        <h3><a href="${esc(n.href)}">${esc(n.name)}</a></h3>${n.sub ? `<p class="dc-sub">${esc(n.sub)}</p>` : ""}
        ${n.chips?.length ? `<p class="in-wings">${n.chips.map(c => `<a href="${esc(c.href)}" style="--c:var(--c-${c.wing.id})"><i aria-hidden="true"></i>${esc(c.wing.name)}</a>`).join("")}</p>` : ""}
        <p class="dc-open"><a href="${esc(n.href)}">Open the full page</a></p></div></div>`;
  const choices = () => {
    if(options === null) return `<div class="dn-grid loading">${`<div class="dn-opt ghost-opt"><span class="dn-img"></span><span class="dn-why">&nbsp;</span><span class="dn-name">&nbsp;</span></div>`.repeat(PER)}</div>`;
    if(!options.length) return `<p class="drift-msg">${esc(msg || "A dead end — step back along the path, or start somewhere else.")}</p>`;
    const set = options.slice(shown, shown + PER);
    return `<div class="dn-grid">${set.map((c, k) => `<button type="button" class="dn-opt" data-pick="${shown + k}">
        <span class="dn-img ${shape(c.node)}">${thumb(c.node)}</span>
        <span class="dn-why">${esc(c.why)}</span><span class="dn-name">${esc(c.node.name)}</span>
        ${c.node.sub ? `<span class="dn-sub">${esc(c.node.sub)}</span>` : ""}<span class="dn-go" aria-hidden="true">→</span></button>`).join("")}</div>`;
  };
  const render = () => {
    const last = path[path.length - 1];
    el.innerHTML = `<ol class="drift-track" aria-label="Your path so far">${path.map((s, i) => `<li class="dt-step${i === path.length - 1 ? " now" : ""}">
        ${i ? `<span class="dt-why">${esc(s.why)}</span>` : ""}
        <button type="button" class="dt-node" data-back="${i}" title="Step back to ${esc(s.node.name)}"><span class="dt-img ${shape(s.node)}">${thumb(s.node)}</span><span class="dt-name">${esc(s.node.name)}</span></button></li>`).join("")}</ol>
      <div class="drift-body">${last ? nodeCard(last.node, last.why) : ""}
      <div class="drift-next"><h3 class="dn-head">Where to next?</h3>${choices()}</div></div>
      <div class="drift-ctl">
        ${options?.length > PER ? `<button type="button" class="ghost" data-more>Other threads ↻</button>` : ""}
        ${options?.length ? `<button type="button" data-surprise>Surprise me ✦</button>` : ""}
        <button type="button" class="ghost" data-restart>Start somewhere new</button></div>`;
  };
  const load = async () => {
    const me = ++token; options = null; shown = 0; msg = ""; render();
    let got = [];
    try {
      const visited = new Set(path.map(s => s.node.key));
      got = (await opts.next(path[path.length - 1].node, visited)).filter(c => !visited.has(c.node.key));
    } catch(e){ msg = "Couldn't reach the library just now — try again."; }
    if(me !== token) return;
    options = got; render();
  };
  const go = c => { path.push(c); load(); };
  el.addEventListener("click", async e => {
    const t = e.target;
    const pick = t.closest("[data-pick]");
    if(pick && options) return go(options[+pick.dataset.pick]);
    if(t.closest("[data-surprise]") && options?.length) return go(options[Math.floor(Math.random() * options.length)]);
    if(t.closest("[data-more]") && options){ shown = shown + PER >= options.length ? 0 : shown + PER; return render(); }
    if(t.closest("[data-restart]")){ const me = ++token; options = null; render();
      try { const n = await opts.restart(); if(me === token){ path = [{node: n}]; load(); } } catch(err){ options = []; msg = "Couldn't reach the library just now — try again."; render(); }
      return; }
    const b = t.closest("[data-back]");
    if(b && +b.dataset.back < path.length - 1){ path = path.slice(0, +b.dataset.back + 1); load(); }
  });
  const begin = node => { path = [{node}]; load(); };
  begin(opts.start);
  return {begin};
}

window.Myriad.discover = {today, monthDay, hash, rng, pick, store, daily, trail, drift};
}
