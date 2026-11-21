#!/usr/bin/env python3
"""Build metronome/data.json: the best-known records of every year, for Metronome's year dial and "Also in [year]".

Asking Wikidata "the best-known albums of 1971" takes several seconds live, too slow for a dial you turn,
so the answers for every year from 1950 are made ahead of time. The live page still asks Wikidata
the quick questions (a record's people, an artist's bandmates) as you go.

Run it from the repository root now and then (it takes about 15 minutes, pausing between queries to be polite to the service):
    python3 tools/build_metronome_data.py
"""
import json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

ENDPOINT = "https://query.wikidata.org/sparql"
AGENT = "MyriadDataBuilder/1.0 (https://prntwrld.github.io/myriad/)"
FIRST, PER_YEAR = 1950, 40
PAUSE = float(os.environ.get("PAUSE", 6))  # seconds between queries (set PAUSE=62 when the service allows only one a minute)
CACHE = os.environ.get("CACHE", "")  # a file to keep finished years in, so an interrupted run can pick up where it stopped


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
            time.sleep(30 + 30 * i)
    raise SystemExit("Wikidata didn't answer; try again later.")


title = lambda u: urllib.parse.unquote(u.rsplit("/wiki/", 1)[-1]).replace("_", " ") if u else ""


def year(y):
    """The best-known albums first released in year y: [English Wikipedia title, name, artist, number of Wikipedias]."""
    rows = ask(f"""SELECT ?al ?alLabel (SAMPLE(?art) AS ?a) (MAX(?sl) AS ?pop) (SAMPLE(?pl) AS ?by) WHERE {{
      VALUES ?t {{ wd:Q482994 wd:Q208569 wd:Q209939 wd:Q169930 }} ?al wdt:P31 ?t ; wdt:P577 ?d ; wikibase:sitelinks ?sl . FILTER(?sl >= 6)
      FILTER(?d >= "{y}-01-01T00:00:00Z"^^xsd:dateTime && ?d < "{y + 1}-01-01T00:00:00Z"^^xsd:dateTime)
      ?art schema:about ?al ; schema:isPartOf <https://en.wikipedia.org/> .
      OPTIONAL {{ ?al wdt:P175 ?p . ?p rdfs:label ?pl . FILTER(LANG(?pl) = "en" || LANG(?pl) = "mul") }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,mul". }}
    }} GROUP BY ?al ?alLabel ORDER BY DESC(?pop) LIMIT {PER_YEAR * 2}""")
    out, seen = [], set()
    for r in rows:
        t = title(r.get("a"))
        # an album first released earlier and reissued this year carries both dates: keep it only in its first year
        if not t or t in seen:
            continue
        seen.add(t)
        out.append([t, r.get("alLabel", ""), r.get("by", ""), int(r.get("pop", 0))])
    return out


def main():
    last = datetime.now(timezone.utc).year - 1
    years = {}
    if CACHE and os.path.exists(CACHE):
        years = json.load(open(CACHE))
    for y in range(FIRST, last + 1):
        if str(y) in years:
            continue
        years[str(y)] = year(y)
        print(y, len(years[str(y)]), file=sys.stderr)
        if CACHE:
            json.dump(years, open(CACHE, "w"))
        time.sleep(PAUSE)
    # a record reissued later can show up in more than one year: it belongs to the earliest
    first = {}
    for y in sorted(years):
        for row in years[y]:
            first.setdefault(row[0], y)
    for y in years:
        years[y] = [row for row in years[y] if first[row[0]] == y][:PER_YEAR]
    data = {"built": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "fields": ["title", "name", "by", "pop"], "years": years}
    with open("metronome/data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print("wrote metronome/data.json", file=sys.stderr)


if __name__ == "__main__":
    main()
