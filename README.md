# Myriad

**A myriad of info** — clean, ad-free topic pages built from the world's open libraries.

Search anything and Myriad builds one page for it: a summary and picture, quick facts, a map, the article's sections, other encyclopedias to read it in, further reading, related topics, and shelves of free books, museum objects, archive finds and historic photographs.

Live at [prntwrld.github.io/myriad](https://prntwrld.github.io/myriad/)

## Wings
Rooms that go deeper on one kind of thing, each with its own accent colour: **Field Guide** (nature), **Cinema**, **Metronome** (music), **Gallery** (art and architecture), **Observatory** (space), **Academy** (research, including AI) and **Arcade** (video games). A topic page notices which wings it belongs to and links to them. Wing landing pages are drawn from the `PAGES` table in `wings.js`; the wing list, nav bar and theme switch live in `site.js`.

**Cinema** is the first wing with its own topic pages (`cinema/cinema.js`). A filmmaker gets a career chart, a poster wall, a collaborator web, where to watch, and movements and influences; a film gets its cast, crew, more by the director, and, when it's in the public domain, the film itself playing on the page; a movement gets its filmmakers and films. The data comes from Wikidata's query service, with posters from Wikipedia.

## Discovery
Myriad should let you find things you didn't know to look for. `discover.js` holds the pieces every wing shares: picks of the day that are the same for everyone and change at midnight, **Drift** (a walk from one thing to a connected thing, one step at a time, saying why), and **your trail** (what you've wandered through across Myriad, kept only in your browser).

Cinema's front page (`cinema/landing.js`) uses them: a double feature of the day joined by a real connection, Drift through films and the people who made them, on this day, a door by decade and country, and Shuffle. Every Cinema page has a *Drift from here* link.

On this day and the door use `cinema/data.json`, thousands of well-known films and film people made ahead of time by `tools/build_cinema_data.py` (a GitHub Action, `.github/workflows/cinema-data.yml`, runs it every Monday and commits the result; start it by hand from the repository's Actions tab, or run the script from the repository root — it takes about 15 minutes, pausing between queries to be polite to Wikidata). Until that file exists, the page uses a built-in canon of well-known films and leaves those two sections out.

## Sources
- [Wikipedia](https://www.wikipedia.org) and [Wikidata](https://www.wikidata.org)
- [OpenStreetMap](https://www.openstreetmap.org)
- [Open Library](https://openlibrary.org) and [Project Gutenberg](https://www.gutenberg.org)
- [The Metropolitan Museum of Art](https://www.metmuseum.org/art/collection) open access collection
- [Internet Archive](https://archive.org)
- [Library of Congress](https://www.loc.gov/photos/) prints & photographs
- [Wikimedia Commons](https://commons.wikimedia.org) images

Text from Wikipedia is available under CC BY-SA.

## Adding links
The hand-picked links are near the top of the script in `index.html`: `BEST` holds the front page's reading room, and `PICKS` holds links for specific topics. Each wing's featured shelf, plan and rooms are in `wings.js`.

## Publishing changes
Browsers keep `style.css` and the scripts for a few minutes. When you change one, bump the `?v=` tag on its links in `index.html` and each wing's `index.html` so visitors get the new file straight away.
