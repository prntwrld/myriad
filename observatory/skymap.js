/* Myriad — Observatory: maps of the sky and of the galaxy.
   - dome(host, {lat, lng, approx}): tonight's sky overhead from a place, with a slider through the night
   - chart(host, {ra, dec, name}): where to find something among the stars, its constellation around it
   - galaxy(host, {ra, dec, ly, name}): where something sits in the Milky Way, seen from above
   Stars, constellations, the Milky Way and Messier's objects come from sky-data.json (built from d3-celestial by
   tools/build_sky_data.py); the planets and the Moon from sky.js; the galaxy picture is NASA/JPL-Caltech's (public domain). */
{
const {esc} = window.Myriad, Sky = window.Sky;
const R = Math.PI / 180;
let DATA = null;
const data = () => DATA ||= fetch("sky-data.json?v=" + (document.querySelector('script[src*="skymap.js"]')?.src.split("v=")[1] || "1"))
  .then(r => r.ok ? r.json() : null).catch(() => null);
const small = () => innerWidth <= 760;
const starColor = bv => bv < 0 ? "#b5ceff" : bv < 0.4 ? "#e9eeff" : bv < 0.8 ? "#fff5df" : bv < 1.2 ? "#ffe0b4" : "#ffc48c";
const starSize = (mag, k = 1) => Math.max(0.55, (5.6 - mag) * 0.62) * k;
const PLANETS = [["moon", "Moon"], ["mercury", "Mercury"], ["venus", "Venus"], ["mars", "Mars"], ["jupiter", "Jupiter"], ["saturn", "Saturn"]];
const PLANET_COLOR = {moon: "#f3eee2", mercury: "#cfc6b8", venus: "#fff4d6", mars: "#f08a5a", jupiter: "#f1d9b0", saturn: "#e9d28f"};
const MARK = (x, y, name, fs) => `<g class="sm-mark"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${fs * 1.1}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${fs * 1.9}" class="sm-pulse"/>
  <text x="${x.toFixed(1)}" y="${(y - fs * 2.4).toFixed(1)}">${esc(name)}</text></g>`;

/* one drawing, whatever the projection: proj(ra, dec) → [x, y] or null when it's off the map */
function drawSky(d, proj, {fs, planetsAt, mark, clip, cons = 2, messier = true, dsoNames = true, skip = ""}){
  const out = [];
  const path = (pts, whole) => { let s = "", pen = false;
    for(const p of pts){ const q = proj(p[0], p[1], whole); if(!q){ pen = false; continue; } s += (pen ? "L" : "M") + q[0].toFixed(1) + "," + q[1].toFixed(1); pen = true; }
    return s; };
  /* the Milky Way: three layers of glow */
  for(const [k, op] of [["ol1", 0.05], ["ol3", 0.06], ["ol5", 0.07]]) for(const ring of d.milky[k] || []){
    /* a glow ring is drawn whole (the map's edge clips it); only a ring that can't be drawn whole is left out */
    const s = path(ring, true); if(s.length > 20 && !s.slice(1).includes("M")) out.push(`<path d="${s}Z" class="sm-mw" style="opacity:${op}"/>`);
  }
  /* constellation figures */
  for(const segs of Object.values(d.lines)) for(const seg of segs){ const s = path(seg); if(s.includes("L")) out.push(`<path d="${s}" class="sm-line"/>`); }
  /* stars, faint ones first so the bright sit on top */
  for(const [ra, dec, mag, bv] of d.stars.slice().sort((a, b) => b[2] - a[2])){
    const q = proj(ra, dec); if(!q) continue;
    out.push(`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${starSize(mag, fs / 13).toFixed(2)}" fill="${starColor(bv)}"/>`);
  }
  /* Messier's named galaxies, nebulae and clusters */
  if(messier) for(const [ra, dec, name, desig, kind, mag] of d.messier){
    if(name === desig || mag > 8.5) continue;
    const q = proj(ra, dec); if(!q) continue;
    const [x, y] = q, r = fs * 0.45;
    out.push(kind === "galaxy" ? `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r * 1.6}" ry="${r * 0.8}" class="sm-dso" transform="rotate(-25 ${x.toFixed(1)} ${y.toFixed(1)})"/>`
      : kind === "nebula" ? `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${2 * r}" height="${2 * r}" class="sm-dso"/>`
      : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" class="sm-dso dotted"/>`);
    if(dsoNames) out.push(`<text x="${(x + r * 2).toFixed(1)}" y="${(y + fs * 0.35).toFixed(1)}" class="sm-dso-name" style="font-size:${(fs * 0.78).toFixed(1)}px">${esc(name)}</text>`);
  }
  /* names: the constellations, then the brightest stars */
  for(const [, name, ra, dec, rank] of d.cons){ if(rank > cons) continue; const q = proj(ra, dec); if(q) out.push(`<text x="${q[0].toFixed(1)}" y="${q[1].toFixed(1)}" class="sm-con" style="font-size:${(fs * 0.8).toFixed(1)}px">${esc(name.toUpperCase())}</text>`); }
  for(const [ra, dec, name] of d.bright){ const q = proj(ra, dec); if(q) out.push(`<text x="${(q[0] + fs * 0.5).toFixed(1)}" y="${(q[1] - fs * 0.4).toFixed(1)}" class="sm-star-name" style="font-size:${(fs * 0.85).toFixed(1)}px">${esc(name)}</text>`); }
  /* the Moon and planets */
  const labels = [];
  if(planetsAt) for(const [k, name] of PLANETS){
    if(k === skip) continue;   /* the planet the chart is about is drawn by its marker */
    const p = Sky.where(k, planetsAt), q = proj(p.ra, p.dec); if(!q) continue;
    const r = k === "moon" ? fs * 0.95 : fs * (k === "venus" || k === "jupiter" ? 0.5 : 0.42);
    let ly = q[1] + r + fs * 1.05;
    while(labels.some(([x, y]) => Math.abs(x - q[0]) < fs * 4 && Math.abs(y - ly) < fs * 1.05)) ly += fs * 1.1;
    labels.push([q[0], ly]);
    out.push(`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${r.toFixed(1)}" fill="${PLANET_COLOR[k]}" class="sm-planet"/>
      <text x="${q[0].toFixed(1)}" y="${ly.toFixed(1)}" class="sm-planet-name" style="font-size:${fs}px">${name}</text>`);
  }
  if(mark){ const q = proj(mark.ra, mark.dec); if(q) out.push(MARK(q[0], q[1], mark.name, fs)); }
  return `<g${clip ? ` clip-path="url(#${clip})"` : ""}>${out.join("")}</g>`;
}

/* ---------- tonight's sky, overhead ---------- */
async function dome(host, {lat, lng, approx = false, note = ""} = {}){
  const d = await data(); if(!d) return false;
  /* on a phone the dome is small: bigger type, but only the best-known names */
  const S = 720, c = S / 2, Rr = c - 34, fs = small() ? 19 : 13;
  const night = Sky.tonight(lat, lng, []).dark;
  const now = Date.now();
  const from = night ? Math.min(night.from, now) : now, to = night ? night.to : now + 8 * 3600e3;
  const start = night && now > night.from && now < night.to ? now : night ? night.from + 1.5 * 3600e3 : now;
  const fmt = t => new Date(t).toLocaleTimeString([], {hour: "numeric", minute: "2-digit"});
  const svg = t => {
    const proj = (ra, dec, whole) => {
      let {alt, az} = Sky.altAz(ra, dec, lat, lng, t);
      if(alt < -8){ if(!whole) return null; alt = Math.max(alt, -75); }
      const r = Rr * Math.tan((90 - alt) / 2 * R);
      return [c - r * Math.sin(az * R), c - r * Math.cos(az * R)];
    };
    const sunUp = Sky.altAz(Sky.sun(t).ra, Sky.sun(t).dec, lat, lng, t).alt;
    const glow = sunUp > -6 ? "twilight" : sunUp > -12 ? "dusk" : "";
    return `<svg class="sm-svg sm-dome ${glow}" viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(`The sky overhead at ${fmt(t)}`)}">
      <defs><clipPath id="dome-clip"><circle cx="${c}" cy="${c}" r="${Rr}"/></clipPath>
        <radialGradient id="dome-bg"><stop offset="0" class="sm-bg0"/><stop offset="1" class="sm-bg1"/></radialGradient></defs>
      <circle cx="${c}" cy="${c}" r="${Rr}" fill="url(#dome-bg)"/>
      ${drawSky(d, proj, {fs, planetsAt: t, clip: "dome-clip", cons: small() ? 1 : 2, dsoNames: !small()})}
      <circle cx="${c}" cy="${c}" r="${Rr}" class="sm-horizon"/>
      ${[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([n, az]) => `<text x="${(c - (Rr + fs * 1.15) * Math.sin(az * R)).toFixed(1)}" y="${(c - (Rr + fs * 1.15) * Math.cos(az * R) + fs * 0.38).toFixed(1)}" class="sm-dir" style="font-size:${fs * 1.05}px">${n}</text>`).join("")}
    </svg>`;
  };
  const steps = Math.max(1, Math.round((to - from) / 6e5));
  host.innerHTML = `<div class="sm"><div class="sm-draw"></div>
    <div class="ob-map-ctl"><button type="button" class="ob-map-play" aria-label="Play">▶</button>
      <input type="range" min="0" max="${steps}" value="${Math.round((start - from) / 6e5)}" aria-label="Through the night">
      <button type="button" class="ghost ob-map-now">Now</button></div>
    <p class="ob-map-when"></p>${note ? `<p class="sm-note">${note}</p>` : ""}</div>`;
  const box = host.querySelector(".sm-draw"), range = host.querySelector("input"), when = host.querySelector(".ob-map-when"), play = host.querySelector(".ob-map-play");
  let playing = 0;
  const show = () => { const t = from + +range.value * 6e5; box.innerHTML = svg(t);
    when.textContent = `${Math.abs(t - now) < 6e5 ? "Now" : fmt(t)} — looking straight up, north at the top, east on the left${approx ? " · roughly where your clock says you are" : ""}`; };
  const stop = () => { cancelAnimationFrame(playing); playing = 0; play.textContent = "▶"; };
  range.oninput = () => { stop(); show(); };
  host.querySelector(".ob-map-now").onclick = () => { stop(); range.value = Math.max(0, Math.min(steps, Math.round((now - from) / 6e5))); show(); };
  play.onclick = () => {
    if(playing) return stop();
    play.textContent = "❚❚"; if(+range.value >= steps) range.value = 0;
    let last = 0;
    const step = ts => { if(ts - last > 70){ last = ts; range.value = +range.value + 1; show(); } if(+range.value >= steps || !host.isConnected) return stop(); playing = requestAnimationFrame(step); };
    playing = requestAnimationFrame(step);
  };
  show();
  return true;
}

/* ---------- where to find it: a chart of the sky around one thing ---------- */
async function chart(host, {ra, dec, name, half = 34, planetsAt = Date.now(), skip = ""}){
  const d = await data(); if(!d) return false;
  const W = 900, H = 600, cx = W / 2, cy = H / 2, fs = small() ? 24 : 14;
  const scale = (W / 2) / (2 * Math.tan(half / 2 * R));
  const sd0 = Math.sin(dec * R), cd0 = Math.cos(dec * R);
  const proj = (a, dd, whole) => {
    const da = (a - ra) * R, sd = Math.sin(dd * R), cd = Math.cos(dd * R);
    let cosc = sd0 * sd + cd0 * cd * Math.cos(da);
    if(cosc < 0.3){ if(!whole) return null; cosc = Math.max(cosc, -0.6); }
    const k = 2 / (1 + cosc), x = cx - scale * k * cd * Math.sin(da), y = cy - scale * k * (cd0 * sd - sd0 * cd * Math.cos(da));
    return !whole && (x < -40 || x > W + 40 || y < -40 || y > H + 40) ? null : [x, y];
  };
  /* the constellation it's in: the nearest constellation's figure, picked out */
  host.innerHTML = `<figure class="sm sm-chart"><svg class="sm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Where ${name} is among the stars`)}">
    <defs><clipPath id="chart-clip"><rect width="${W}" height="${H}"/></clipPath></defs>
    <rect width="${W}" height="${H}" class="sm-bg"/>${drawSky(d, proj, {fs, planetsAt, mark: {ra, dec, name}, clip: "chart-clip", cons: 3, skip})}</svg>
    <figcaption>North at the top, east on the left — as the sky looks when you face it</figcaption></figure>`;
  return true;
}

/* ---------- where it is in the Milky Way, from above ---------- */
/* right ascension and declination → galactic longitude and latitude (J2000) */
const galactic = (ra, dec) => {
  const aG = 192.85948 * R, dG = 27.12825 * R, lN = 122.93192, a = ra * R, d = dec * R;
  const b = Math.asin(Math.sin(d) * Math.sin(dG) + Math.cos(d) * Math.cos(dG) * Math.cos(a - aG));
  const l = lN - Math.atan2(Math.cos(d) * Math.sin(a - aG), Math.sin(d) * Math.cos(dG) - Math.cos(d) * Math.sin(dG) * Math.cos(a - aG)) / R;
  return {l: ((l % 360) + 360) % 360, b: b / R};
};
const GALAXY_PIC = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/236084main_MilkyWay-full-annotated.jpg/960px-236084main_MilkyWay-full-annotated.jpg";
const GALAXY_PAGE = "https://commons.wikimedia.org/wiki/File:236084main_MilkyWay-full-annotated.jpg";
function galaxy(host, {ra, dec, ly, name}){
  if(!ly || ly > 70000) return false;
  /* on the 960px picture: the Sun at (480, 662), the galaxy's centre straight up, about 7.33px to every 1,000 light-years */
  const {l, b} = galactic(ra, dec), flat = ly * Math.cos(b * R), k = 7.33 / 1000;
  const x = 480 - Math.sin(l * R) * flat * k, y = 662 - Math.cos(l * R) * flat * k;
  const near = flat * k < 10;
  const fs = small() ? 30 : 18;
  host.innerHTML = `<figure class="sm sm-galaxy"><svg class="sm-svg" viewBox="0 0 960 960" role="img" aria-label="${esc(`Where ${name} is in the Milky Way`)}">
    <image href="${GALAXY_PIC}" width="960" height="960"/>
    ${near ? "" : `<line x1="480" y1="662" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="sm-gal-line"/>`}
    ${MARK(x, y, name, fs)}</svg>
    <figcaption>${near ? `${esc(name)} is ${Math.round(ly).toLocaleString("en-US")} light-years away — right beside the Sun at this scale. ` : ""}The Milky Way from above: the Sun near the bottom, the galaxy's centre in the middle.
      Picture: <a href="${GALAXY_PAGE}" target="_blank" rel="noopener">NASA/JPL-Caltech/R. Hurt</a></figcaption></figure>`;
  return true;
}

window.SkyMap = {dome, chart, galaxy, galactic, data};
}
