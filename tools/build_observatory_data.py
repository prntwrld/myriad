#!/usr/bin/env python3
"""Build observatory/days.json: spaceflight on this day, for the Observatory's front page.

Asking Wikidata "what launched, landed or was discovered on 21 November?" takes longer than its query service allows,
so the well-known launches, landings and discoveries (of moons and planets) are gathered here ahead of time,
keyed by month and day. History doesn't change much, so this needs running only now and then:
    python3 tools/build_observatory_data.py
It takes a few minutes, pausing a minute between queries to be polite to the service.
"""
import json, sys, time, urllib.parse, urllib.request

ENDPOINT = "https://query.wikidata.org/sparql"
AGENT = "MyriadDataBuilder/1.0 (https://prntwrld.github.io/myriad/)"
PAUSE = 65  # seconds between queries: the service sometimes allows only one a minute


def ask(query, tries=6):
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
filename = lambda u: urllib.parse.unquote(u.rsplit("/", 1)[-1]) if u else ""

# what happened, and how sure the date has to be (a launch known only to the year has no day to put it on)
KINDS = [
    ("launch", "?x wdt:P619 ?d .", 12),
    ("land", "?x wdt:P620 ?d .", 12),
    # discoveries: moons and other bodies that orbit something other than the Sun, and the planets and dwarf planets found since antiquity
    ("found", "?x wdt:P575 ?d ; wdt:P397 ?p . FILTER(?p != wd:Q525 || ?x IN (wd:Q324, wd:Q332, wd:Q339, wd:Q596, wd:Q1885, wd:Q1975, wd:Q1980))", 12),
]


def gather():
    out = []
    for kind, where, fame in KINDS:
        rows = ask(f"""SELECT ?x ?xLabel ?a (SAMPLE(?d0) AS ?d) (MAX(?sl) AS ?pop) (SAMPLE(?logo) AS ?patch) (SAMPLE(?img) AS ?pic) WHERE {{
          {where} ?x wikibase:sitelinks ?sl . FILTER(?sl >= {fame})
          ?x p:{ {"launch": "P619", "land": "P620", "found": "P575"}[kind] } ?st . ?st psv:{ {"launch": "P619", "land": "P620", "found": "P575"}[kind] } ?v .
          ?v wikibase:timePrecision ?prec . FILTER(?prec >= 11) ?v wikibase:timeValue ?d0 .
          ?a schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> .
          OPTIONAL {{ ?x wdt:P154 ?logo }} OPTIONAL {{ ?x wdt:P18 ?img }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }} GROUP BY ?x ?xLabel ?a""")
        print(f"{kind}: {len(rows)}", file=sys.stderr)
        for r in rows:
            d = r.get("d", "")
            if len(d) < 10 or d[5:10] == "00-00":
                continue
            out.append([qid(r["x"]), title(r.get("a")), r.get("xLabel", ""), kind, d[:10], int(r.get("pop", 0)),
                        filename(r.get("patch") or r.get("pic") or "")])
        time.sleep(PAUSE)
    return out


def main():
    rows = gather()
    days = {}
    for row in sorted(rows, key=lambda r: -r[5]):
        days.setdefault(row[4][5:10], []).append(row)
    data = {"fields": ["id", "enwiki", "label", "kind", "date", "wikipedias", "image"], "days": days}
    with open("observatory/days.json", "w", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(rows)} events on {len(days)} days", file=sys.stderr)


if __name__ == "__main__":
    main()
