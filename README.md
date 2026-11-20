# Myriad

**A myriad of info** — clean, ad-free topic pages built from the world's open libraries.

Search anything and Myriad builds one page for it: summary, picture, quick facts, a map, article sections, related topics, hand-picked best links, plus free books, museum objects and archive finds.

Live at [myriadof.info](https://myriadof.info)

## What it searches
- Wikipedia (summary, sections, related topics)
- Wikidata (quick facts)
- OpenStreetMap via Leaflet (maps)
- Open Library (free public-domain books), with Project Gutenberg via Gutendex as a backup
- The Metropolitan Museum of Art Open Access (art and objects, v1.1 search API)
- Internet Archive's library collections (books, film, audio)

## Links: what goes where
All of these live near the top of the script in `index.html`:

- **`BEST`** — *The reading room* on the front page: great sites, grouped by subject. Homepages are fine here.
- **`PICKS`** — hand-picked links for one exact topic (keyed by Wikipedia title), shown first under
  *Further reading*. Link to the page about that topic, not a site's homepage.
- **`READ_ON`** — other encyclopedias (Britannica, Stanford Encyclopedia of Philosophy, HistoryLink…)
  shown beside *Read the full article*. They are found automatically through the topic's Wikidata IDs,
  so they always point at the right article.
- **`REFS`** — specialist sources (Smithsonian volcano data, iNaturalist, Animal Diversity Web…),
  also found through Wikidata IDs, listed under *Further reading*.

To add a source to `READ_ON` or `REFS`, find its Wikidata property (for example `P1417` is
Britannica) and the property's "formatter URL", where `$1` stands for the ID.

## Files
- `index.html` — the page and its script
- `style.css` — the look (classical type, light and dark themes)
- `v0.html` — the first design, kept for comparison at `/v0.html`

## Hosting (GitHub Pages)
1. Repo **Settings → Pages**: Source = *Deploy from a branch*, `main`, `/ (root)`.
   The site is then live at `https://prntwrld.github.io/myriad/`.
2. At your domain registrar, add these DNS records for `myriadof.info`:

   | Type    | Host / Name | Value |
   |---------|-------------|-------|
   | `A`     | `@`         | `185.199.108.153` |
   | `A`     | `@`         | `185.199.109.153` |
   | `A`     | `@`         | `185.199.110.153` |
   | `A`     | `@`         | `185.199.111.153` |
   | `AAAA`  | `@`         | `2606:50c0:8000::153` |
   | `AAAA`  | `@`         | `2606:50c0:8001::153` |
   | `AAAA`  | `@`         | `2606:50c0:8002::153` |
   | `AAAA`  | `@`         | `2606:50c0:8003::153` |
   | `CNAME` | `www`       | `prntwrld.github.io` |

   Remove any other `A`, `AAAA` or `CNAME` records for `@` and `www` (for example a registrar "parking" page).
   The `AAAA` records are optional but recommended.
3. **Only after the DNS records are saved:** in Settings → Pages, enter `myriadof.info` as the custom domain
   and save. GitHub adds a `CNAME` file to the repo for you. (Adding the custom domain before DNS is ready
   makes the site unreachable, because the github.io address starts redirecting to the domain.)
4. Wait for the DNS check to pass, then tick **Enforce HTTPS** (the certificate can take up to a day).
5. Optional but recommended: verify the domain under your GitHub account's **Settings → Pages**, so no one
   else can claim it for their own Pages site.
