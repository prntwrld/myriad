# Myriad

**A myriad of info** — clean, ad-free topic pages built from the world's open libraries.

Search anything and Myriad builds one page for it: summary, picture, quick facts, a map, article sections, related topics, hand-picked best links, plus free books, museum objects and archive finds.

Live at [myriadof.info](https://myriadof.info)

## What it searches
- Wikipedia (summary, sections, related topics)
- Wikidata (quick facts)
- OpenStreetMap via Leaflet (maps)
- Project Gutenberg via Gutendex (free books)
- The Metropolitan Museum of Art Open Access (art and objects)
- Internet Archive (books, film, audio)

## Best links
The hand-picked links live in the `BEST` object near the top of the script in `index.html`. Add a topic, its keywords, and its links. That curated list is what makes Myriad more than a search box.

## Hosting (GitHub Pages)
1. Push these files to a repo (for example `myriad`).
2. Repo **Settings → Pages**: Source = `main` branch, `/ (root)`.
3. At your domain registrar, add DNS records for `myriadof.info`:
   - `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `<your-github-username>.github.io`
4. Back in Settings → Pages, set the custom domain to `myriadof.info` and tick **Enforce HTTPS** once it's available.
