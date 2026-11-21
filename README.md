# Myriad

**A myriad of info** — clean, ad-free topic pages built from the world's open libraries.

Search anything and Myriad builds one page for it: a summary and picture, quick facts, a map, the article's sections, other encyclopedias to read it in, further reading, related topics, and shelves of free books, museum objects, archive finds and historic photographs.

Live at [prntwrld.github.io/myriad](https://prntwrld.github.io/myriad/)

## Wings
Rooms that go deeper on one kind of thing, each with its own accent colour: **Field Guide** (nature), **Cinema**, **Metronome** (music), **Gallery** (art and architecture), **Observatory** (space), **Academy** (research, including AI) and **Arcade** (video games). A topic page notices which wings it belongs to and links to them. Wing landing pages are drawn from the `PAGES` table in `wings.js`; the wing list, nav bar and theme switch live in `site.js`.

**Cinema** is the first wing with its own topic pages (`cinema/cinema.js`). A filmmaker gets a career chart, a poster wall, a collaborator web, where to watch, and movements and influences; a film gets its cast, crew, more by the director, and, when it's in the public domain, the film itself playing on the page; a movement gets its filmmakers and films. The data comes from Wikidata's query service, with posters from Wikipedia.

**Field Guide** has its own topic pages too (`field-guide/guide.js`), leaning toward the Pacific Northwest. A species gets iNaturalist's photographs, songs and calls that play on the page, its field marks from Wikipedia, its look-alikes side by side (from what iNaturalist's identifiers most often confuse it with), a GBIF range map and a bar of the months it's seen, sightings near you (only if you allow your location), its IUCN status, and its place in the tree of life. A group (a family, a genus) gets its members and relatives; a wild place (Mount Rainier) gets what lives there. Recordings are Xeno-canto's, by way of Wikimedia Commons, since Xeno-canto's own API now needs a personal key; when Commons has none, iNaturalist observers' recordings stand in. Every recording is checked before it's shown.

The Field Guide's front page (`field-guide/landing.js`) opens on a species of the day, then a wall of what's been seen in Washington, Oregon and British Columbia this week, what's blooming, migrating, singing and fruiting this month, Drift through look-alikes and relatives, a shelf of the season's songs that plays straight through, and your collection.

**Observatory** has its own topic pages too (`observatory/observatory.js`). A planet, moon, star, galaxy or nebula gets its picture beside the title, its numbers from Wikidata put in terms you can feel ("1,300 Earths would fit inside", "the light you see left it around 1480"), every spacecraft that went there as a timeline of mission patches, who discovered it and when, the neighbours that share its parent body or constellation, a wall of pictures from the NASA Image and Video Library, and — only if you allow your location — whether it's up tonight and which way to look. A mission gets where it went, what it found, its crew, what came before it and what it led to, and the rest of its programme. Where things are in the sky is worked out in the browser (`observatory/sky.js`), so your location never leaves it.

The Observatory's front page (`observatory/landing.js`) opens on NASA's Astronomy Picture of the Day, then a wall of the sky, an object of the day, the Moon and planets tonight, the next launches (Launch Library 2), Drift from a world to the spacecraft that went there and what they found, a walk outward from Earth to the edge of what we can see, spaceflight on this day, and your collection. The maps (`observatory/skymap.js`): tonight's sky overhead on the front page (for your exact place if you share it, otherwise roughly where your clock says you are, with a slider through the night), the solar system from above with every planet where it is today, and on each star, galaxy or nebula's page a chart of where to find it among the stars and, for things inside our galaxy, where it sits in the Milky Way. The stars, constellations, Milky Way and Messier objects are in `observatory/sky-data.json`, built once by `tools/build_sky_data.py` from [d3-celestial](https://github.com/ofrohn/d3-celestial).

A search in the Observatory that turns out not to be about space (Sombrero the hat) goes to Myriad's general page, with a link back.

On this day uses `observatory/days.json`, made ahead of time by `tools/build_observatory_data.py` (run it from the repository root now and then; it takes a few minutes).

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
- [Wikimedia Commons](https://commons.wikimedia.org) images, and Xeno-canto's recordings
- [iNaturalist](https://www.inaturalist.org), [GBIF](https://www.gbif.org) and [Xeno-canto](https://xeno-canto.org)
- [NASA](https://images.nasa.gov) (the Image and Video Library and the Astronomy Picture of the Day) and [Launch Library 2](https://thespacedevs.com/llapi)
- Star maps from [d3-celestial](https://github.com/ofrohn/d3-celestial) by Olaf Frohn (BSD-3-Clause), after the Hipparcos catalogue; the Milky Way from above by NASA/JPL-Caltech/R. Hurt

Text from Wikipedia is available under CC BY-SA.

## Adding links
The hand-picked links are near the top of the script in `index.html`: `BEST` holds the front page's reading room, and `PICKS` holds links for specific topics. Each wing's featured shelf, plan and rooms are in `wings.js`.

## Publishing changes
Browsers keep `style.css` and the scripts for a few minutes. When you change one, bump the `?v=` tag on its links in `index.html` and each wing's `index.html` so visitors get the new file straight away.
