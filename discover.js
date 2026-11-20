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
const TRAIL = "myriad-trail", TRAIL_MAX = 40;
const trail = {
  add(item){ /* {wing, title, name} */
    if(!item?.title) return;
    const list = store.get(TRAIL, []).filter(x => !(x.title === item.title && x.wing === item.wing));
    list.unshift({...item, at: Date.now()}); store.set(TRAIL, list.slice(0, TRAIL_MAX));
  },
  list: () => store.get(TRAIL, []),
  clear: () => store.set(TRAIL, []),
  html(n = 14){
    const list = trail.list().slice(0, n); if(!list.length) return "";
    return `<ol class="trail">${list.map(x => {
      const w = WINGS.find(w => w.id === x.wing);
      const href = w ? Myriad.topicIn(w, x.title) : `${Myriad.ROOT}?t=${encodeURIComponent(x.title)}`;
      return `<li><a href="${esc(href)}"${w ? ` style="--c:var(--c-${w.id})"` : ""}>${w ? `<i aria-hidden="true"></i>` : ""}${esc(x.name || x.title)}</a></li>`;
    }).join("")}</ol>`;
  }
};

/* ---------- Drift: a walk through connections ----------
   drift(el, {start, next}) — start is a node; next(node, visited) returns [{node, why}] candidates.
   A node is {key, name, href, img, sub, chips:[{wing, href}]}. "why" is the joining phrase ("shot by"). */
function drift(el, opts){
  let path = [], pending = false, alts = [];
  const nodeCard = (n, why) => `<div class="drift-card">
      <a class="dc-img" href="${esc(n.href)}">${n.img ? `<img src="${esc(n.img)}" alt="">` : `<span class="dc-ini">${esc(n.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span>`}</a>
      <div class="dc-text">${why ? `<p class="dc-why">${esc(why)}</p>` : `<p class="dc-why">Starting from</p>`}
        <h3><a href="${esc(n.href)}">${esc(n.name)}</a></h3>${n.sub ? `<p class="dc-sub">${esc(n.sub)}</p>` : ""}
        ${n.chips?.length ? `<p class="in-wings">${n.chips.map(c => `<a href="${esc(c.href)}" style="--c:var(--c-${c.wing.id})"><i aria-hidden="true"></i>${esc(c.wing.name)}</a>`).join("")}</p>` : ""}</div></div>`;
  const render = msg => {
    const last = path[path.length - 1];
    el.innerHTML = `<ol class="drift-path">${path.map((s, i) => `${i ? `<li class="dp-why">${esc(s.why)}</li>` : ""}<li class="dp-node${i === path.length - 1 ? " now" : ""}"><button type="button" data-back="${i}">${esc(s.node.name)}</button></li>`).join("")}</ol>
      ${last ? nodeCard(last.node, last.why) : ""}
      <div class="drift-ctl"><button type="button" data-step>${path.length > 1 ? "Next step" : "Start drifting"} →</button>
        ${path.length > 1 ? `<button type="button" class="ghost" data-other>Another way</button>` : ""}
        <button type="button" class="ghost" data-restart>Start somewhere else</button>
        ${msg ? `<span class="drift-msg">${esc(msg)}</span>` : ""}</div>`;
  };
  const step = async (replaceLast = false) => {
    if(pending) return; pending = true;
    const from = replaceLast ? path[path.length - 2] : path[path.length - 1];
    render("Looking…");
    try {
      if(!replaceLast || !alts.length){
        const visited = new Set(path.map(s => s.node.key));
        alts = (await opts.next(from.node, visited)).filter(c => !visited.has(c.node.key));
      }
      if(replaceLast) alts = alts.filter(c => c.node.key !== path[path.length - 1].node.key);
      if(!alts.length){ pending = false; render("A dead end — try another way, or start somewhere else."); return; }
      const c = alts.shift();
      if(replaceLast) path[path.length - 1] = c; else path.push(c);
      pending = false; render();
    } catch(e){ pending = false; render("Couldn't reach the library just now — try again."); }
  };
  el.addEventListener("click", async e => {
    if(e.target.closest("[data-step]")) step();
    else if(e.target.closest("[data-other]")) step(true);
    else if(e.target.closest("[data-restart]")){ pending = true; render("Finding somewhere new…"); try { path = [{node: await opts.restart()}]; alts = []; } catch(err){} pending = false; render(); }
    else { const b = e.target.closest("[data-back]"); if(b){ path = path.slice(0, +b.dataset.back + 1); alts = []; render(); } }
  });
  const begin = node => { path = [{node}]; alts = []; render(); };
  begin(opts.start);
  return {begin};
}

window.Myriad.discover = {today, monthDay, hash, rng, pick, store, daily, trail, drift};
}
