/* Myriad — the wing landing pages. Every wing is drawn by the same template from the PAGES table below,
   so the wings share one grammar: masthead, a featured shelf,
   hand-picked rooms of links, and the sources. Only the accent colour and the content change. */
{
const {ROOT, esc} = window.Myriad;
const $ = id => document.getElementById(id);
const ext = `target="_blank" rel="noopener"`;

const PAGES = {
  "field-guide": {
    tag: "A field guide to the living world — birds, beasts and plants, how to know them, and where to find them.",
    placeholder: "A bird, a tree, a mushroom — varied thrush, salal, chanterelle…",
    chips: ["Varied thrush","Western redcedar","Banana slug","Chanterelle","Great blue heron","Salal"],
    feature: {label:"Birds of the Pacific Northwest", sub:"A first page of the guide — open any one", photos:true,
      items:["Steller's jay","Varied thrush","Bald eagle","Great blue heron","Anna's hummingbird","Pileated woodpecker","Black-capped chickadee","Spotted towhee"]},
    rooms: {
      "Identify it": [
        {t:"iNaturalist", u:"https://www.inaturalist.org", why:"Photograph anything alive; naturalists help name it."},
        {t:"Merlin Bird ID", u:"https://merlin.allaboutbirds.org", why:"Free app that names birds by photo or by song."},
        {t:"All About Birds", u:"https://www.allaboutbirds.org", why:"Cornell Lab's species guide: ID, life history, sounds."}],
      "Listen": [
        {t:"Xeno-canto", u:"https://xeno-canto.org", why:"Bird sounds from around the world, shared freely."},
        {t:"Macaulay Library", u:"https://www.macaulaylibrary.org", why:"The world's largest archive of wildlife audio and video."}],
      "Plants": [
        {t:"Washington Native Plant Society", u:"https://www.wnps.org", why:"The go-to for PNW native plants."},
        {t:"USDA PLANTS Database", u:"https://plants.usda.gov", why:"Every plant in the U.S., with range maps."}],
      "Fungi": [
        {t:"Puget Sound Mycological Society", u:"https://www.psms.org", why:"Forays, identification days and the Northwest's mushroom lore."},
        {t:"MushroomExpert.com", u:"https://www.mushroomexpert.com", why:"Michael Kuo's keys and species pages."}],
      "Go deeper": [
        {t:"eBird", u:"https://ebird.org", why:"Where birds are being seen right now."},
        {t:"Animal Diversity Web", u:"https://animaldiversity.org", why:"University of Michigan species accounts."}]},
    sources: "iNaturalist, GBIF, Wikidata, Wikipedia, and Xeno-canto's recordings on Wikimedia Commons"
  },

  "cinema": {
    tag: "A screening room for films and filmmakers — who made what, with whom, and where to watch it.",
    placeholder: "A film, a director, a movement — Godard, Tarkovsky, Italian neorealism…",
    chips: ["Jean-Luc Godard","Agnès Varda","Andrei Tarkovsky","Akira Kurosawa","French New Wave","Italian neorealism"],
    feature: {label:"Jean-Luc Godard, 1960–1967", sub:"The New Wave years, one film a season — a preview of a filmmaker's page", photos:true,
      items:["Breathless (1960 film)","Le Petit Soldat","A Woman Is a Woman","Vivre sa vie","Contempt (film)","Band of Outsiders","Alphaville (film)","Pierrot le Fou","Masculin Féminin","Weekend (1967 film)"],
      watch:[["Kanopy","https://www.kanopy.com/en/search?query=godard"],["Letterboxd","https://letterboxd.com/director/jean-luc-godard/"],
        ["JustWatch","https://www.justwatch.com/us/search?q=godard"],["MUBI","https://mubi.com/en/cast/jean-luc-godard"],
        ["Internet Archive","https://archive.org/search?query=godard&and%5B%5D=mediatype%3A%22movies%22"]]},
    explore: {label:"Movements", sub:"Open one to see its filmmakers and films",
      items:["French New Wave","Italian neorealism","German Expressionism","New Hollywood","Japanese New Wave","Cinema Novo","Soviet montage theory","Dogme 95","Film noir","Poetic realism"]},
    plan: [
      ["Career","A filmmaker's films a year, as directing, writing, acting or shooting."],
      ["Filmography","Every film on a poster wall, decade by decade."],
      ["Collaborators","The people they kept working with, drawn as a web — line weight is films shared."],
      ["Where to watch","Kanopy (free with a library card), the Criterion Channel, JustWatch, and free films on the Internet Archive — some play right on the page."],
      ["Movements & influence","The movement they belong to, who they learned from, and who learned from them."],
      ["Cast, crew & images","For a film: who was in it, who made it, more by the director, and stills from Commons."]],
    rooms: {
      "Watch": [
        {t:"Kanopy", u:"https://www.kanopy.com", why:"Free with many public library and university cards."},
        {t:"The Criterion Channel", u:"https://www.criterionchannel.com", why:"The art-house canon, with essays and extras."},
        {t:"Internet Archive: Feature Films", u:"https://archive.org/details/feature_films", why:"Public-domain features, free to stream."}],
      "Log & discover": [
        {t:"Letterboxd", u:"https://letterboxd.com", why:"Diaries, lists and reviews from serious film lovers."},
        {t:"MUBI", u:"https://mubi.com", why:"Hand-picked cinema and a deep film database."}],
      "Read": [
        {t:"Senses of Cinema", u:"https://www.sensesofcinema.com", why:"Free online film journal, with great director profiles."},
        {t:"BFI", u:"https://www.bfi.org.uk", why:"British Film Institute: features, lists, and Sight and Sound."}]},
    sources: "Wikidata, Wikipedia, TMDB, the Internet Archive"
  },

  "metronome": {
    tag: "Music to discover — records, artists and scenes, and always something to play next.",
    placeholder: "An album, an artist, a sound — Alice Coltrane, krautrock, Blue…",
    chips: ["Alice Coltrane","Talking Heads","Krautrock","Bossa nova","Nina Simone","Sun Ra"],
    feature: {label:"Start with a record", sub:"Albums that open whole worlds — a preview of the record shelf", photos:true,
      items:["Kind of Blue","A Love Supreme","Pet Sounds","Blue (Joni Mitchell album)","Remain in Light","Illmatic","Unknown Pleasures","OK Computer"]},
    plan: [
      ["Discography","Every release on a shelf of covers, from MusicBrainz and the Cover Art Archive."],
      ["If you like this","Similar artists and listening paths from ListenBrainz."],
      ["Listen","Samples and links out to Bandcamp, streaming services, and free live recordings."],
      ["The scene","Bandmates, labels, producers, and the city and era it came from."],
      ["Genre map","Where it sits among neighbouring sounds, and the records that define each one."],
      ["Liner notes","Credits, the story of the recording, and the best writing about it."]],
    rooms: {
      "Dig": [
        {t:"MusicBrainz", u:"https://musicbrainz.org", why:"The open encyclopedia of recorded music."},
        {t:"Discogs", u:"https://www.discogs.com", why:"Every pressing of every record, and a marketplace."},
        {t:"ListenBrainz", u:"https://listenbrainz.org", why:"Open listening history and recommendations."}],
      "Listen": [
        {t:"Bandcamp", u:"https://bandcamp.com", why:"Buy straight from artists; endless scenes to wander."},
        {t:"Live Music Archive", u:"https://archive.org/details/etree", why:"Hundreds of thousands of free concert recordings."},
        {t:"Radio Garden", u:"https://radio.garden", why:"Spin the globe and tune into live radio anywhere."}],
      "Read": [
        {t:"AllMusic", u:"https://www.allmusic.com", why:"Reviews, biographies and similar-artist maps."},
        {t:"KEXP", u:"https://www.kexp.org", why:"Seattle's listener-powered station and live sessions."}]},
    sources: "MusicBrainz, the Cover Art Archive, ListenBrainz, Wikidata, the Internet Archive"
  },

  "gallery": {
    tag: "A gallery of art and architecture — paintings, prints and buildings, the people who made them, and where to see them.",
    placeholder: "A painting, an artist, a building — Hokusai, Fallingwater, Art Nouveau…",
    chips: ["Hokusai","Hilma af Klint","Fallingwater","Zaha Hadid","Art Nouveau","Brutalist architecture"],
    feature: {label:"A first walk through the gallery", sub:"Paintings and buildings — open any one", photos:true,
      items:["The Great Wave off Kanagawa","Fallingwater","Las Meninas","Sagrada Família","Nighthawks","Villa Savoye","Girl with a Pearl Earring","Sydney Opera House","The Garden of Earthly Delights","Pantheon, Rome"]},
    plan: [
      ["Works","An artist's works on a wall in order, from the Art Institute of Chicago, the Cleveland Museum of Art and The Met."],
      ["The big picture","A large, zoomable image of a single work, with what it is, when, and where it hangs."],
      ["Buildings","Photographs, the architect, the style, the date, and a map — with others like it nearby."],
      ["Lineage","Teachers and students, the movement, who it came from and where it went."],
      ["Drift","From artist to movement to building to architect, one step at a time."],
      ["Look by colour","Find works by their colour and their century."]],
    rooms: {
      "Museums with open collections": [
        {t:"Art Institute of Chicago", u:"https://www.artic.edu/collection", why:"Thousands of public-domain works in high resolution."},
        {t:"The Met Collection", u:"https://www.metmuseum.org/art/collection", why:"Over 400,000 open-access images."},
        {t:"Rijksmuseum", u:"https://www.rijksmuseum.nl/en/collection", why:"Dutch masters, free to download and zoom."}],
      "Learn to look": [
        {t:"Smarthistory", u:"https://smarthistory.org", why:"Free, expert art history — videos and essays."},
        {t:"Google Arts & Culture", u:"https://artsandculture.google.com", why:"Museums worldwide, zoomed to the brushstroke."}],
      "Architecture": [
        {t:"SAH Archipedia", u:"https://sah-archipedia.org", why:"Scholarly entries on thousands of American buildings."},
        {t:"ArchDaily", u:"https://www.archdaily.com", why:"Today's architecture, with drawings and photographs."}]},
    sources: "the Art Institute of Chicago, the Cleveland Museum of Art, The Met, Wikidata, Wikipedia, Wikimedia Commons"
  },

  "observatory": {
    tag: "An observatory for everyone — planets, stars, missions, and what's up in tonight's sky.",
    placeholder: "A planet, a star, a mission — Jupiter, Betelgeuse, Cassini…",
    chips: ["Jupiter","Betelgeuse","Cassini–Huygens","Orion Nebula","Europa (moon)","Apollo 11"],
    apod: true,
    feature: {label:"A tour of the sky", sub:"From the planets out to other galaxies", photos:true,
      items:["Jupiter","Saturn","Pillars of Creation","Orion Nebula","Crab Nebula","Andromeda Galaxy","Voyager 1","James Webb Space Telescope"]},
    plan: [
      ["Tonight's sky","Whether it's up tonight from where you are, and where to look."],
      ["The numbers","Distance, size, mass and orbit, with comparisons you can feel."],
      ["Missions","Every spacecraft that has visited, with what it found."],
      ["Image gallery","The best pictures from the NASA and ESA archives."],
      ["Upcoming launches","What's flying next, from Launch Library."],
      ["Further out","Neighbouring objects, and exoplanets from the NASA Exoplanet Archive."]],
    rooms: {
      "Look up": [
        {t:"Stellarium Web", u:"https://stellarium-web.org", why:"A planetarium in your browser, for any place and time."},
        {t:"Heavens-Above", u:"https://www.heavens-above.com", why:"When to see the Space Station and satellites pass over."}],
      "Pictures": [
        {t:"Astronomy Picture of the Day", u:"https://apod.nasa.gov", why:"One image a day since 1995, explained by astronomers."},
        {t:"NASA Image and Video Library", u:"https://images.nasa.gov", why:"Huge free archive of space photos and video."}],
      "Missions & data": [
        {t:"NASA's Eyes", u:"https://eyes.nasa.gov", why:"Ride along with spacecraft in real time."},
        {t:"NASA Exoplanet Archive", u:"https://exoplanetarchive.ipac.caltech.edu", why:"Every confirmed planet around another star."},
        {t:"ESA", u:"https://www.esa.int", why:"The European Space Agency's missions and science."}]},
    sources: "NASA, ESA, Wikidata, Wikipedia, Launch Library"
  },

  "academy": {
    tag: "An academy for the curious — find the papers, follow the citations, read them free.",
    placeholder: "A field, a paper, a scholar — information theory, CRISPR, Hannah Arendt…",
    chips: ["Information theory","CRISPR","Claude Shannon","Hannah Arendt","Plate tectonics","Large language model"],
    feature: {label:"Papers that changed everything", sub:"Landmarks, each a short read — a preview of a paper's page",
      items:[
        {t:"A Mathematical Theory of Communication", m:"Shannon · 1948"},
        {t:"Computing Machinery and Intelligence", m:"Turing · 1950"},
        {t:"Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid", short:"Molecular Structure of Nucleic Acids", m:"Watson & Crick · 1953"},
        {t:"Annus mirabilis papers", short:"On the Electrodynamics of Moving Bodies", m:"Einstein · 1905"},
        {t:"Attention Is All You Need", m:"Vaswani et al. · 2017"},
        {t:"On the Origin of Species", m:"Darwin · 1859"}]},
    plan: [
      ["Paper search","Search 250 million works in OpenAlex, sorted by influence or by date."],
      ["Read it free","A legal open-access copy wherever one exists."],
      ["Citation trail","What a paper built on and what built on it, to walk forwards and backwards."],
      ["Scholars","An author's papers, collaborators and institutions."],
      ["Fields","The landmark papers of any field, and where it's heading."],
      ["The AI shelf","New machine-learning research, read alongside the classics it builds on."]],
    rooms: {
      "Search": [
        {t:"OpenAlex", u:"https://openalex.org", why:"The open catalogue of the world's research."},
        {t:"Google Scholar", u:"https://scholar.google.com", why:"Broad search across papers, theses and books."},
        {t:"Semantic Scholar", u:"https://www.semanticscholar.org", why:"AI-assisted search with citation context."}],
      "Read free": [
        {t:"arXiv", u:"https://arxiv.org", why:"Preprints in physics, maths and computer science."},
        {t:"CORE", u:"https://core.ac.uk", why:"Millions of open-access papers in full text."},
        {t:"PubMed Central", u:"https://www.ncbi.nlm.nih.gov/pmc/", why:"Free full-text biomedical research."}],
      "The AI shelf": [
        {t:"arXiv: AI, recent", u:"https://arxiv.org/list/cs.AI/recent", why:"New artificial-intelligence papers as they appear."},
        {t:"Hugging Face Papers", u:"https://huggingface.co/papers", why:"Each day's notable machine-learning papers."},
        {t:"Distill", u:"https://distill.pub", why:"Beautifully explained machine-learning research."}]},
    sources: "OpenAlex, Crossref, arXiv, Wikidata, Wikipedia"
  },

  "arcade": {
    tag: "An arcade and archive for video games — their history, their makers, and old games you can play right here.",
    placeholder: "A game, a studio, a console — Myst, Nintendo 64, Hideo Kojima…",
    chips: ["Myst","Nintendo 64","Shigeru Miyamoto","Katamari Damacy","Doom (1993 video game)","Sega Dreamcast"],
    feature: {label:"Games worth knowing", sub:"Four decades, one shelf — a preview of the game shelf", photos:true,
      items:["Tetris","Super Mario Bros.","Myst","Doom (1993 video game)","The Legend of Zelda: Ocarina of Time","Katamari Damacy","Shadow of the Colossus","Outer Wilds"]},
    plan: [
      ["Play it","Old games that run right in the browser through the Internet Archive's emulators."],
      ["Platforms & release","Every platform and region, with dates and box art."],
      ["Makers","The studio and the people behind it, and what else they made."],
      ["How long to beat","Typical play time, so you know what you're in for."],
      ["Where to get it","Today's stores and re-releases: Steam, GOG, and the rest."],
      ["The history","Its lineage, what it borrowed, and what it inspired."]],
    rooms: {
      "Play in the browser": [
        {t:"Internet Arcade", u:"https://archive.org/details/internetarcade", why:"Classic arcade machines, emulated, free."},
        {t:"Software Library: MS-DOS Games", u:"https://archive.org/details/softwarelibrary_msdos_games", why:"Thousands of DOS games, playable in the browser."}],
      "History & data": [
        {t:"MobyGames", u:"https://www.mobygames.com", why:"The deep database of games and their credits."},
        {t:"Video Game History Foundation", u:"https://gamehistory.org", why:"Preserving games and the stories behind them."},
        {t:"The Cutting Room Floor", u:"https://tcrf.net", why:"Unused content and secrets dug out of game files."}],
      "Find something new": [
        {t:"itch.io", u:"https://itch.io", why:"Independent games, many free or pay-what-you-want."},
        {t:"HowLongToBeat", u:"https://howlongtobeat.com", why:"How many hours a game takes to finish."}]},
    sources: "Wikidata, Wikipedia, the Internet Archive, MobyGames"
  }
};

const id = document.body.dataset.wing, P = PAGES[id], W = window.Myriad.ALL_WINGS.find(w => w.id === id);
/* a wing with its own topic pages keeps its links inside the wing; the others open Myriad's main page */
const topic = t => W.ready ? `./?t=${encodeURIComponent(t)}` : `${ROOT}?t=${encodeURIComponent(t)}`;
document.title = `${W.name} — Myriad`;
/* the wing's line lives on as the page description (shared links, search results), not on the page */
document.querySelector('meta[name="description"]')?.setAttribute("content", P.tag);
/* a wing that isn't open yet says so once, quietly, beside its name */
if(!W.ready) document.querySelector(".logo")?.insertAdjacentHTML("afterend", `<span class="soon">Opening soon</span>`);
$("q").placeholder = P.placeholder;
$("chips").innerHTML = P.chips.map(t => `<a href="${topic(t)}">${esc(t)}</a>`).join("");
/* for now a wing's search opens the topic on Myriad's main page, which links back to the wing */
if(!W.ready) $("f").addEventListener("submit", e => { e.preventDefault(); const q = $("q").value.trim(); if(q) location.href = `${ROOT}?q=${encodeURIComponent(q)}`; });

/* the featured shelf: covers come from each Wikipedia article's lead image (posters, album covers, photos) */
const F = P.feature, items = F.items.map(x => typeof x === "string" ? {t:x} : x);
const card = x => `<a class="item" href="${topic(x.t)}"><div class="obj"><span class="cover">${esc(x.short || x.t)}</span></div>
  <div class="placard"><div class="t">${esc((x.short || x.t).replace(/ \((\d{4} )?(film|video game|album|moon)\)$/,"").replace(/ \(Joni Mitchell album\)/,""))}</div>${x.m ? `<div class="m">${esc(x.m)}</div>` : ""}</div></a>`;
$("main").innerHTML = `
  ${P.apod ? `<section class="section apod" id="apod" hidden><h2 class="label">Today's picture</h2><p class="sub">NASA's Astronomy Picture of the Day</p><div id="apodbox"></div></section>` : ""}
  ${W.ready ? "" : `<section class="section shelf feature"><h2 class="label">${esc(F.label)}</h2><p class="sub">${esc(F.sub)}</p>
    <div class="row" id="feature">${items.map(card).join("")}</div>
  </section>`}
  ${P.explore ? `<section class="section"><h2 class="label">${esc(P.explore.label)}</h2><p class="sub">${esc(P.explore.sub)}</p>
    <div class="toc">${P.explore.items.map(t => `<a class="tag-link" href="${topic(t)}">${esc(t)}</a>`).join("")}</div></section>` : ""}
  <section class="section"><h2 class="label">Rooms</h2><p class="sub">Hand-picked places to go next</p>
    <div class="room">${Object.entries(P.rooms).map(([n, links]) => `<div><h3>${esc(n)}</h3><ul>${links.map(l =>
      `<li><a href="${esc(l.u)}" ${ext}>${esc(l.t)}</a><span>${esc(l.why)}</span></li>`).join("")}</ul></div>`).join("")}</div></section>`;
$("sources").textContent = `${W.name} draws on ${P.sources}. Text from Wikipedia is available under CC BY-SA.`;

/* swap each cloth cover for the article's lead picture (a poster, an album cover, a photo), all in one request.
   pilicense=any includes the fair-use posters and covers that only English Wikipedia hosts. */
if(F.photos){
  const cards = [...document.querySelectorAll("#feature .item")];
  const url = "https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=pageimages&piprop=thumbnail&pithumbsize=400&pilicense=any&redirects=1&titles="
    + encodeURIComponent(items.map(x => x.t).join("|"));
  /* one polite retry if Wikipedia says "too many requests" */
  const get = (tries=2) => fetch(url, {signal: AbortSignal.timeout(12000)}).then(r =>
    r.status === 429 && tries > 1 ? new Promise(ok => setTimeout(ok, 1500)).then(() => get(tries-1)) : r.ok ? r.json() : null);
  get().then(j => {
      if(!j?.query) return;
      /* follow normalisations and redirects back to the titles we asked for */
      const back = {};
      for(const m of [...(j.query.normalized || []), ...(j.query.redirects || [])]) back[m.to] = back[m.from] || m.from;
      const pic = {};
      for(const pg of Object.values(j.query.pages || {})) if(pg.thumbnail) pic[back[pg.title] || pg.title] = pg.thumbnail.source;
      cards.forEach((a, i) => {
        const src = pic[items[i].t]; if(!src) return;
        const img = new Image(); img.alt = "";
        img.onload = () => a.querySelector(".cover")?.replaceWith(img);
        img.src = src;
      });
    }).catch(() => {});
}

/* Observatory: today's Astronomy Picture of the Day (NASA's shared demo key allows a few dozen visits an hour) */
if(P.apod) fetch("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY", {signal: AbortSignal.timeout(12000)})
  .then(r => r.ok ? r.json() : null).then(a => {
    if(!a || a.media_type !== "image") return;
    $("apodbox").innerHTML = `<figure class="apod-fig"><a href="https://apod.nasa.gov/apod/astropix.html" ${ext}><img src="${esc(a.url)}" alt="${esc(a.title)}"></a>
      <figcaption><b>${esc(a.title)}</b><span class="when">${esc(a.date)}${a.copyright ? ` · ${esc(a.copyright.trim())}` : ""}</span>
      <span class="expl">${esc(a.explanation)}</span></figcaption></figure>`;
    $("apod").hidden = false;
  }).catch(() => {});
}
