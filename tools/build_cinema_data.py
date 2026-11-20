#!/usr/bin/env python3
"""Build cinema/data.json: the well-known films and film people that Cinema's discovery page draws on.

Wikidata's query service is too slow to ask, on every visit, "which well-known films came out on this day?"
or "the best films from Japan in the 1960s", so those answers come from this file, built ahead of time.
The live page still asks Wikidata the quick questions (a film's people, a person's films) as you drift.

Run it from the repository root now and then (it takes about 15 minutes, pausing between queries to be polite to the service):
    python3 tools/build_cinema_data.py
"""
import json, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

ENDPOINT = "https://query.wikidata.org/sparql"
AGENT = "MyriadDataBuilder/1.0 (https://prntwrld.github.io/myriad/)"
FILM_TYPES = "wd:Q11424 wd:Q24869 wd:Q202866 wd:Q226730"


PAUSE = 65  # seconds between queries: the service sometimes allows only one a minute


def ask(query, tries=8):
    url = ENDPOINT + "?format=json&query=" + urllib.parse.quote(query)
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": AGENT, "Accept": "application/sparql-results+json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                rows = json.load(r)["results"]["bindings"]
                return [{k: v["value"] for k, v in row.items()} for row in rows]
        except Exception as e:  # timeouts and "too many requests": wait longer each time
            print(f"  retry {i + 1}: {e}", file=sys.stderr)
            time.sleep(PAUSE + 15 * i)
    raise SystemExit("Wikidata didn't answer; try again later.")


qid = lambda u: u.rsplit("/", 1)[-1]
title = lambda u: urllib.parse.unquote(u.rsplit("/wiki/", 1)[-1]).replace("_", " ") if u else ""


def dates(packed):
    """'1960-03-16T00:00:00Z|11 1961-…|9' → the first year, and that first release's month-day if known to the day."""
    seen = []
    for part in packed.split():
        d, _, prec = part.partition("|")
        if d[:1] in "+-" and d[1:2].isdigit():
            d = d[1:]
        try:
            seen.append((int(d[:4]), d[5:10], int(prec or 0)))
        except ValueError:
            pass
    if not seen:
        return 0, ""
    year = min(y for y, _, _ in seen)
    days = sorted(md for y, md, p in seen if y == year and p >= 11 and md != "00-00")
    return year, days[0] if days else ""


def films():
    """Films known in at least 25 Wikipedias, in fame bands so each query stays quick."""
    out = {}
    for lo, hi in [(25, 28), (28, 32), (32, 37), (37, 43), (43, 52), (52, 65), (65, 1000)]:
        print(f"films with {lo}–{hi} Wikipedias…", file=sys.stderr)
        rows = ask(f"""SELECT ?film ?a ?label (MAX(?sl) AS ?pop) (GROUP_CONCAT(DISTINCT ?dp; separator=" ") AS ?ds)
          (GROUP_CONCAT(DISTINCT STR(?c); separator=" ") AS ?cs) (SAMPLE(?ia) AS ?arch) WHERE {{
          VALUES ?type {{ {FILM_TYPES} }} ?film wdt:P31 ?type ; wikibase:sitelinks ?sl . FILTER(?sl >= {lo} && ?sl < {hi})
          ?film p:P577/psv:P577 [ wikibase:timeValue ?d ; wikibase:timePrecision ?p ] . BIND(CONCAT(STR(?d), "|", STR(?p)) AS ?dp)
          OPTIONAL {{ ?film wdt:P495 ?c }} OPTIONAL {{ ?film wdt:P724 ?ia }}
          OPTIONAL {{ ?a schema:about ?film ; schema:isPartOf <https://en.wikipedia.org/> }}
          OPTIONAL {{ ?film rdfs:label ?label . FILTER(LANG(?label) = "en") }}
        }} GROUP BY ?film ?a ?label""")
        for r in rows:
            year, md = dates(r.get("ds", ""))
            name = title(r.get("a")) or r.get("label", "")
            if not year or not name:
                continue
            out[qid(r["film"])] = [qid(r["film"]), title(r.get("a")), r.get("label", "") if not r.get("a") else "",
                                   year, md, int(r["pop"]), [qid(c) for c in r.get("cs", "").split()], r.get("arch", "")]
        time.sleep(PAUSE)
    return sorted(out.values(), key=lambda f: -f[5])


def people():
    """Directors, actors, cinematographers, screenwriters and film composers known in at least 40 Wikipedias."""
    out = {}
    for occ, what in [("Q2526255", "director"), ("Q10800557", "film actor"), ("Q33999", "actor"), ("Q222344", "cinematographer"),
                      ("Q28389", "screenwriter"), ("Q1415090", "film score composer")]:
        print(f"{what}s…", file=sys.stderr)
        rows = ask(f"""SELECT ?x ?a ?label (MAX(?sl) AS ?pop) (SAMPLE(?bd) AS ?b) (SAMPLE(?img) AS ?pic) WHERE {{
          ?x wdt:P106 wd:{occ} ; wikibase:sitelinks ?sl . FILTER(?sl >= 40)
          ?x p:P569/psv:P569 [ wikibase:timeValue ?bd ; wikibase:timePrecision 11 ] .
          OPTIONAL {{ ?x wdt:P18 ?img }}
          OPTIONAL {{ ?a schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> }}
          OPTIONAL {{ ?x rdfs:label ?label . FILTER(LANG(?label) = "en") }}
        }} GROUP BY ?x ?a ?label""")
        for r in rows:
            b = r.get("b", "").lstrip("+")
            if not r.get("a") or len(b) < 10:
                continue
            pic = urllib.parse.unquote(r.get("pic", "").rsplit("/", 1)[-1]) if r.get("pic") else ""
            out.setdefault(qid(r["x"]), [qid(r["x"]), title(r["a"]), int(b[:4]), b[5:10], int(r["pop"]), pic, what])
        time.sleep(PAUSE)
    return sorted(out.values(), key=lambda p: -p[4])


def countries(film_rows):
    counts = {}
    for f in film_rows:
        for c in f[6]:
            counts[c] = counts.get(c, 0) + 1
    top = [c for c, n in sorted(counts.items(), key=lambda kv: -kv[1]) if n >= 12][:40]
    rows = ask("SELECT ?c ?cLabel WHERE { VALUES ?c { " + " ".join("wd:" + c for c in top)
               + ' } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }')
    names = {qid(r["c"]): r["cLabel"] for r in rows}
    return {c: [names.get(c, c), counts[c]] for c in top}


if __name__ == "__main__":
    f = films()
    data = {
        "built": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "about": "Well-known films and film people from Wikidata, for Cinema's discovery page. Built by tools/build_cinema_data.py.",
        "filmFields": ["id", "enwiki", "label", "year", "monthDay", "wikipedias", "countries", "archive"],
        "peopleFields": ["id", "enwiki", "born", "monthDay", "wikipedias", "commonsImage", "work"],
        "films": f,
        "people": people(),
        "countries": countries(f),
    }
    with open("cinema/data.json", "w", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(data['films'])} films, {len(data['people'])} people, {len(data['countries'])} countries", file=sys.stderr)
