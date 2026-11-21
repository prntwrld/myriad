/* Myriad — Observatory: where things are in the sky, worked out in the browser.
   Positions of the Sun, Moon and planets from Paul Schlyter's low-precision orbital elements (good to a fraction of a degree,
   plenty for "is it up tonight, and which way do I look"); stars, galaxies and nebulae from their right ascension and declination.
   Nothing here asks anything of a server, and a visitor's location never leaves the browser. */
{
const R = Math.PI / 180, rev = x => ((x % 360) + 360) % 360;
const sin = x => Math.sin(x * R), cos = x => Math.cos(x * R), atan2 = (y, x) => Math.atan2(y, x) / R;
const jd = t => t / 864e5 + 2440587.5;
/* Schlyter's day number: days since 2000 Jan 0.0 UT */
const dn = t => jd(t) - 2451543.5;

/* orbital elements at day d: [N, i, w, a, e, M] in degrees and AU */
const EL = {
  mercury: d => [48.3313 + 3.24587e-5 * d, 7.0047 + 5e-8 * d, 29.1241 + 1.01444e-5 * d, 0.387098, 0.205635 + 5.59e-10 * d, 168.6562 + 4.0923344368 * d],
  venus:   d => [76.6799 + 2.4659e-5 * d, 3.3946 + 2.75e-8 * d, 54.891 + 1.38374e-5 * d, 0.72333, 0.006773 - 1.302e-9 * d, 48.0052 + 1.6021302244 * d],
  mars:    d => [49.5574 + 2.11081e-5 * d, 1.8497 - 1.78e-8 * d, 286.5016 + 2.92961e-5 * d, 1.523688, 0.093405 + 2.516e-9 * d, 18.6021 + 0.5240207766 * d],
  jupiter: d => [100.4542 + 2.76854e-5 * d, 1.303 - 1.557e-7 * d, 273.8777 + 1.64505e-5 * d, 5.20256, 0.048498 + 4.469e-9 * d, 19.895 + 0.0830853001 * d],
  saturn:  d => [113.6634 + 2.3898e-5 * d, 2.4886 - 1.081e-7 * d, 339.3939 + 2.97661e-5 * d, 9.55475, 0.055546 - 9.499e-9 * d, 316.967 + 0.0334442282 * d],
  uranus:  d => [74.0005 + 1.3978e-5 * d, 0.7733 + 1.9e-8 * d, 96.6612 + 3.0565e-5 * d, 19.18171 - 1.55e-8 * d, 0.047318 + 7.45e-9 * d, 142.5905 + 0.011725806 * d],
  neptune: d => [131.7806 + 3.0173e-5 * d, 1.77 - 2.55e-7 * d, 272.8461 - 6.027e-6 * d, 30.05826 + 3.313e-8 * d, 0.008606 + 2.15e-9 * d, 260.2471 + 0.005995147 * d]
};
const kepler = (M, e) => { let E = M + e / R * sin(M) * (1 + e * cos(M)); for(let k = 0; k < 8; k++) E = E - (E - e / R * sin(E) - M) / (1 - e * cos(E)); return E; };
const orbit = ([N, i, w, a, e, M]) => {
  const E = kepler(rev(M), e), xv = a * (cos(E) - e), yv = a * Math.sqrt(1 - e * e) * sin(E);
  const v = atan2(yv, xv), r = Math.hypot(xv, yv);
  return {r, x: r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i)), y: r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i)), z: r * sin(v + w) * sin(i)};
};
/* the Sun as seen from Earth: ecliptic longitude and distance (AU) */
const sunAt = d => {
  const w = 282.9404 + 4.70935e-5 * d, e = 0.016709 - 1.151e-9 * d, M = rev(356.047 + 0.9856002585 * d);
  const E = kepler(M, e), xv = cos(E) - e, yv = Math.sqrt(1 - e * e) * sin(E);
  const r = Math.hypot(xv, yv), lon = rev(atan2(yv, xv) + w);
  return {lon, r, M, L: rev(M + w), x: r * cos(lon), y: r * sin(lon), z: 0};
};
const obliquity = d => 23.4393 - 3.563e-7 * d;
const toEq = (x, y, z, d) => {
  const ob = obliquity(d), ye = y * cos(ob) - z * sin(ob), ze = y * sin(ob) + z * cos(ob);
  return {ra: rev(atan2(ye, x)), dec: atan2(ze, Math.hypot(x, ye)), dist: Math.hypot(x, y, z)};
};

/* a planet: geocentric right ascension and declination (degrees), distance from Earth and Sun (AU), and brightness */
function planet(name, t){
  const d = dn(t), el = EL[name](d), s = sunAt(d);
  let h = orbit(el);
  /* Jupiter and Saturn pull on each other enough to matter */
  if(name === "jupiter" || name === "saturn"){
    const Mj = rev(19.895 + 0.0830853001 * d), Ms = rev(316.967 + 0.0334442282 * d);
    let lon = atan2(h.y, h.x), lat = atan2(h.z, Math.hypot(h.x, h.y));
    if(name === "jupiter") lon += -0.332 * sin(2 * Mj - 5 * Ms - 67.6) - 0.056 * sin(2 * Mj - 2 * Ms + 21) + 0.042 * sin(3 * Mj - 5 * Ms + 21)
      - 0.036 * sin(Mj - 2 * Ms) + 0.022 * cos(Mj - Ms) + 0.023 * sin(2 * Mj - 3 * Ms + 52) - 0.016 * sin(Mj - 5 * Ms - 69);
    else { lon += 0.812 * sin(2 * Mj - 5 * Ms - 67.6) - 0.229 * cos(2 * Mj - 4 * Ms - 2) + 0.119 * sin(Mj - 2 * Ms - 3) + 0.046 * sin(2 * Mj - 6 * Ms - 69) + 0.014 * sin(Mj - 3 * Ms + 32);
      lat += -0.02 * cos(2 * Mj - 4 * Ms - 2) + 0.018 * sin(2 * Mj - 6 * Ms - 49); }
    h = {r: h.r, x: h.r * cos(lon) * cos(lat), y: h.r * sin(lon) * cos(lat), z: h.r * sin(lat)};
  }
  const g = {x: h.x + s.x, y: h.y + s.y, z: h.z + s.z};
  const eq = toEq(g.x, g.y, g.z, d);
  /* phase angle, then Schlyter's magnitudes */
  const R2 = eq.dist, rr = h.r, FV = Math.acos(Math.max(-1, Math.min(1, (rr * rr + R2 * R2 - s.r * s.r) / (2 * rr * R2)))) / R;
  const base = 5 * Math.log10(rr * R2);
  const mag = {mercury: -0.36 + base + 0.027 * FV + 2.2e-13 * FV ** 6, venus: -4.34 + base + 0.013 * FV + 4.2e-7 * FV ** 3, mars: -1.51 + base + 0.016 * FV,
    jupiter: -9.25 + base + 0.014 * FV, saturn: -9 + base + 0.044 * FV, uranus: -7.15 + base + 0.001 * FV, neptune: -6.9 + base + 0.001 * FV}[name];
  const glon = atan2(g.y, g.x);
  return {...eq, fromSun: rr, mag, elong: elongation(glon, s.lon)};
}
/* how far east (+) or west (−) of the Sun something sits along the ecliptic */
const elongation = (lon, sunLon) => ((lon - sunLon + 540) % 360) - 180;

/* the Moon: position, distance (km) and phase */
function moon(t){
  const d = dn(t), s = sunAt(d);
  const N = rev(125.1228 - 0.0529538083 * d), i = 5.1454, w = rev(318.0634 + 0.1643573223 * d), a = 60.2666, e = 0.0549, M = rev(115.3654 + 13.0649929509 * d);
  const E = kepler(M, e), xv = a * (cos(E) - e), yv = a * Math.sqrt(1 - e * e) * sin(E), v = atan2(yv, xv);
  let r = Math.hypot(xv, yv);
  const x = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i)), y = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i)), z = r * sin(v + w) * sin(i);
  let lon = atan2(y, x), lat = atan2(z, Math.hypot(x, y));
  const Ms = s.M, Mm = M, Ls = s.L, Lm = rev(M + w + N), D = Lm - Ls, F = Lm - N;
  lon += -1.274 * sin(Mm - 2 * D) + 0.658 * sin(2 * D) - 0.186 * sin(Ms) - 0.059 * sin(2 * Mm - 2 * D) - 0.057 * sin(Mm - 2 * D + Ms) + 0.053 * sin(Mm + 2 * D)
    + 0.046 * sin(2 * D - Ms) + 0.041 * sin(Mm - Ms) - 0.035 * sin(D) - 0.031 * sin(Mm + Ms) - 0.015 * sin(2 * F - 2 * D) + 0.011 * sin(Mm - 4 * D);
  lat += -0.173 * sin(F - 2 * D) - 0.055 * sin(Mm - F - 2 * D) - 0.046 * sin(Mm + F - 2 * D) + 0.033 * sin(F + 2 * D) + 0.017 * sin(2 * Mm + F);
  r += -0.58 * cos(Mm - 2 * D) - 0.46 * cos(2 * D);
  const eq = toEq(cos(lon) * cos(lat), sin(lon) * cos(lat), sin(lat), d);
  const el = elongation(lon, s.lon);
  /* the lit fraction, and how far through the month it is (0 new, 0.5 full) */
  const fraction = (1 - cos(Math.abs(el))) / 2, phase = rev(lon - s.lon) / 360;
  return {ra: eq.ra, dec: eq.dec, km: r * 6371, parallax: Math.asin(1 / r) / R, fraction, phase, waxing: el > 0, elong: el};
}
const PHASES = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
const phaseName = p => PHASES[Math.round(p * 8) % 8];

/* the Sun's right ascension and declination */
const sun = t => { const d = dn(t), s = sunAt(d); return {...toEq(s.x, s.y, 0, d), km: s.r * 149597870.7}; };

/* altitude and azimuth (degrees; azimuth from north through east) for a place */
const gmst = t => rev(280.46061837 + 360.98564736629 * (jd(t) - 2451545));
function altAz(ra, dec, lat, lng, t){
  const H = rev(gmst(t) + lng - ra);
  const alt = Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(H)) / R;
  const az = rev(atan2(-cos(dec) * sin(H), sin(dec) * cos(lat) - cos(dec) * sin(lat) * cos(H)));
  return {alt, az};
}
const DIRS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
const compass = az => DIRS[Math.round(rev(az) / 45) % 8];

/* where a thing is at time t: by name ("moon", "mars"…) or by {ra, dec} */
function where(thing, t){
  if(typeof thing === "string"){
    if(thing === "moon") return moon(t);
    if(thing === "sun") return sun(t);
    return planet(thing, t);
  }
  return thing;
}

/* Tonight, from a place: the dark hours ahead (the Sun more than 10° down), and for each thing its path through them —
   the highest it gets, when, and which way to look. Steps every 10 minutes through the next 24 hours. */
function tonight(lat, lng, things, now = Date.now()){
  const step = 10 * 60e3, n = 24 * 6 + 1, times = Array.from({length: n}, (_, k) => now + k * step);
  const sunAlt = times.map(t => { const s = sun(t); return altAz(s.ra, s.dec, lat, lng, t).alt; });
  /* the first stretch of darkness from now on */
  let a = sunAlt.findIndex(x => x < -10);
  if(a < 0) return {dark: null, things: things.map(() => null)};
  let b = a; while(b + 1 < n && sunAlt[b + 1] < -10) b++;
  const dusk = times[a], dawn = times[b];
  const paths = things.map(th => {
    const pts = [];
    for(let k = a; k <= b; k++){
      const p = where(th, times[k]);
      let {alt, az} = altAz(p.ra, p.dec, lat, lng, times[k]);
      if(p.parallax) alt -= p.parallax * Math.cos(alt * R);   /* the Moon sits a little lower than seen from Earth's centre */
      pts.push({t: times[k], alt, az});
    }
    const best = pts.reduce((m, x) => x.alt > m.alt ? x : m, pts[0]);
    const up = pts.filter(x => x.alt >= 10);
    return {pts, best, up: up.length ? {from: up[0].t, to: up.at(-1).t} : null};
  });
  /* the whole night's curve for drawing: a few hours either side of the dark */
  return {dark: {from: dusk, to: dawn, already: a === 0}, things: paths};
}

/* a thing's altitude through a span of time, for drawing its arc across the night */
function arc(th, lat, lng, from, to, steps = 60){
  return Array.from({length: steps + 1}, (_, k) => {
    const t = from + (to - from) * k / steps, p = where(th, t);
    let {alt, az} = altAz(p.ra, p.dec, lat, lng, t);
    if(p.parallax) alt -= p.parallax * Math.cos(alt * R);
    return {t, alt, az};
  });
}

/* where a planet is around the Sun: heliocentric ecliptic x, y (AU), for drawing the solar system from above */
function helio(name, t){
  const d = dn(t);
  if(name === "earth"){ const s = sunAt(d); return {x: -s.x, y: -s.y, r: s.r}; }
  const h = orbit(EL[name](d));
  return {x: h.x, y: h.y, r: h.r};
}

/* rough distance from Earth, in km, for the Sun, Moon and planets right now */
const AU = 149597870.7;
const distanceKm = (name, t = Date.now()) => name === "moon" ? moon(t).km : name === "sun" ? sun(t).km : planet(name, t).dist * AU;

window.Sky = {helio, planet, moon, sun, altAz, compass, tonight, arc, where, phaseName, distanceKm, elongation, AU, PLANETS: Object.keys(EL)};
}
