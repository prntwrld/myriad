#!/usr/bin/env python3
"""Build observatory/sky-data.json: the stars, constellations, Milky Way and Messier objects the Observatory's sky maps draw.

The source is Olaf Frohn's d3-celestial (BSD-3-Clause; star data from the Hipparcos catalogue, the Milky Way outline
after Hipparcos-based maps). Fetch the package from npm and point this script at its data folder:
    npm pack d3-celestial@0.7.35 && tar -xzf d3-celestial-0.7.35.tgz
    python3 tools/build_sky_data.py package/data
The result is small enough to load with the page: right ascension and declination in degrees, rounded.
"""
import json, math, sys

src = sys.argv[1] if len(sys.argv) > 1 else "package/data"
load = lambda f: json.load(open(f"{src}/{f}", encoding="utf-8"))
ra = lambda lon: round(lon + 360 if lon < 0 else lon, 2)
r1 = lambda x: round(x, 1)

STAR_LIMIT = 5.3   # what a fairly dark sky shows to the eye

stars = [[ra(f["geometry"]["coordinates"][0]), round(f["geometry"]["coordinates"][1], 2), round(float(f["properties"]["mag"]), 1),
          round(float(f["properties"].get("bv") or 0.6), 1)]
         for f in load("stars.6.json")["features"] if float(f["properties"]["mag"]) <= STAR_LIMIT]

# the brightest stars by their proper names
names = load("starnames.json")
bright = {}
for f in load("stars.6.json")["features"]:
    n = names.get(str(f["id"]), {}).get("name")
    if n and float(f["properties"]["mag"]) <= 1.6:
        bright[n] = [ra(f["geometry"]["coordinates"][0]), round(f["geometry"]["coordinates"][1], 2), n]

lines = {f["id"]: [[[ra(p[0]), round(p[1], 2)] for p in seg] for seg in f["geometry"]["coordinates"]]
         for f in load("constellations.lines.json")["features"]}
cons = [[f["id"], f["properties"]["name"], ra(f["geometry"]["coordinates"][0]), round(f["geometry"]["coordinates"][1], 1), int(f["properties"].get("rank", 3))]
        for f in load("constellations.json")["features"]]


def thin(ring, step=0.8):
    """drop points closer than `step` degrees to the last one kept, so the outline stays light"""
    out = [ring[0]]
    for p in ring[1:]:
        if math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) >= step:
            out.append(p)
    return [[r1(p[0] + 360 if p[0] < 0 else p[0]), r1(p[1])] for p in out] if len(out) > 3 else None


milky = {}
for f in load("mw.json")["features"]:
    if f["id"] in ("ol1", "ol3", "ol5"):
        milky[f["id"]] = [r for poly in f["geometry"]["coordinates"] for r in (thin(ring) for ring in poly) if r]

# Messier's galaxies, nebulae and clusters
KIND = {"gg": "galaxy", "g": "galaxy", "s": "galaxy", "s0": "galaxy", "sd": "galaxy", "i": "galaxy", "e": "galaxy",
        "oc": "cluster", "gc": "cluster", "ocn": "cluster", "pn": "nebula", "bn": "nebula", "dn": "nebula", "rn": "nebula", "en": "nebula", "snr": "nebula", "sfr": "nebula"}
messier = []
for f in load("messier.json")["features"]:
    p = f["properties"]
    messier.append([ra(f["geometry"]["coordinates"][0]), round(f["geometry"]["coordinates"][1], 2), p.get("alt") or f["id"], f["id"],
                    KIND.get(str(p.get("type", "")).lower(), "other"), round(float(p.get("mag") or 9), 1)])

data = {"source": "d3-celestial by Olaf Frohn (BSD-3-Clause), from the Hipparcos catalogue", "fields": {
    "stars": ["ra", "dec", "mag", "bv"], "bright": ["ra", "dec", "name"], "cons": ["id", "name", "ra", "dec", "rank"],
    "messier": ["ra", "dec", "name", "desig", "kind", "mag"]},
    "stars": stars, "bright": list(bright.values()), "lines": lines, "cons": cons, "milky": milky, "messier": messier}
with open("observatory/sky-data.json", "w", encoding="utf-8") as out:
    json.dump(data, out, ensure_ascii=False, separators=(",", ":"))
print(f"{len(stars)} stars, {len(bright)} named, {len(lines)} constellations, {sum(len(v) for v in milky.values())} Milky Way rings, {len(messier)} Messier objects", file=sys.stderr)
