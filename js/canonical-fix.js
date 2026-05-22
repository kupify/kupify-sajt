/*
 * canonical-fix.js
 *
 * ============================================================
 * BLOK 0) LEGENDA
 * ============================================================
 *
 * Svrha skripte:
 * - Sinhronizuje <link rel="canonical"> sa trenutnim URL-om.
 * - Automatski dodaje i ažurira <meta name="robots">.
 * - Automatski dopunjuje <title> na paginiranim kategorijama.
 * - Sprečava da paginirane stranice pogrešno kanonizuju na page 1.
 * - Sprečava indeksiranje tehničkih filter URL-ova sa group parametrom.
 *
 * Zašto je ovo potrebno:
 * - Kategorije na KUPIFY sajtu koriste client-side paginaciju.
 * - URL se menja preko JavaScript-a, najčešće kroz:
 * 
 *      history.pushState()
 *      history.replaceState()
 *
 * - HTML fajl na disku ima statičan canonical i statičan title.
 * - Kada korisnik ili Google otvori URL kao:
 *
 *      /pages/products/tv-i-video/?page=2
 *
 *   stranica mora u live DOM-u da dobije tačan:
 *
 *      canonical
 *      robots
 *      title
 *
 * Bez ovog skripta:
 *
 *      /tv-i-video/?page=2
 *
 *   može da ostane sa:
 *
 *      canonical → /tv-i-video/
 *      robots    → pogrešan ili nepostojeći
 *      title     → isti kao page 1
 *
 *   što pravi problem jer Google ne vidi jasno da je page 2 posebna
 *   paginirana stranica sa drugim proizvodima.
 *
 * ============================================================
 * BLOK 1) PAGINACIJA
 * ============================================================
 *
 * Paginacija koristi page parametar:
 *
 *      ?page=2
 *      ?page=3
 *      ?page=4
 *
 * Pravila za običnu paginaciju:
 *
 * 1) Page 1
 *
 *      URL:
 *      /pages/products/tv-i-video/
 *
 *      canonical:
 *      /pages/products/tv-i-video/
 *
 *      robots:
 *      index, follow
 *
 *      title:
 *      TV i video | KUPIFY.rs
 *
 * 2) Page 2+
 *
 *      URL:
 *      /pages/products/tv-i-video/?page=2
 *
 *      canonical:
 *      /pages/products/tv-i-video/?page=2
 *
 *      robots:
 *      index, follow
 *
 *      title:
 *      TV i video - stranica 2 | KUPIFY.rs
 *
 * Važno:
 * - Paginirane kategorije NISU noindex.
 * - Page 2, page 3 itd. treba da budu indeksabilne stranice.
 * - Svaka paginirana strana ima svoj canonical sa odgovarajućim ?page= brojem.
 *
 * ============================================================
 * BLOK 2) TITLE ZA PAGINACIJU
 * ============================================================
 *
 * Kada je URL paginiran, skripta automatski dopunjuje title.
 *
 * Primer sa nazivom sajta:
 *      pre:
 *      <title>TV i video | KUPIFY.rs</title>
 *
 *      posle:
 *      <title>TV i video - stranica 2 | KUPIFY.rs</title>
 *
 * Primer bez naziva sajta:
 *      pre:
 *      <title>TV i video</title>
 *
 *      posle:
 *      <title>TV i video - stranica 2</title>
 *
 * Skripta prvo čisti postojeći dodatak:
 *
 *      - stranica 2
 *      - stranica 3
 *
 * pa zatim upisuje novi broj strane.
 *
 * Time se sprečava dupliranje tipa:
 *
 *      TV i video - stranica 2 - stranica 3 | KUPIFY.rs
 *
 * ============================================================
 * BLOK 3) HASH PARAMETRI
 * ============================================================
 *
 * Hash deo URL-a se ignoriše za SEO:
 *
 *      ?page=2#sort=name-asc
 *
 * canonical postaje:
 *
 *      ?page=2
 *
 * Razlog:
 * - Hash deo URL-a služi za client-side stanje interfejsa.
 * - Google ga ne tretira kao klasičan URL parametar za indeksiranje.
 * - Sortiranje ne treba da pravi posebne canonical URL-ove.
 *
 * ============================================================
 * BLOK 4) GROUP FILTER
 * ============================================================
 *
 * Group parametar predstavlja tehnički filter unutar kategorije:
 *
 *      ?group=hdmi
 *      ?group=nosaci
 *      ?group=adapteri
 *
 * Group filter NIJE posebna SEO stranica.
 *
 * Pravila za group URL-ove:
 *
 * 1) Group bez paginacije
 *
 *      URL:
 *      /pages/products/tv-i-video/?group=hdmi
 *
 *      canonical:
 *      /pages/products/tv-i-video/
 *
 *      robots:
 *      noindex, follow
 *
 * 2) Group sa paginacijom
 *
 *      URL:
 *      /pages/products/tv-i-video/?group=hdmi&page=2
 *
 *      canonical:
 *      /pages/products/tv-i-video/
 *
 *      robots:
 *      noindex, follow
 *
 * Razlog:
 * - group filter je samo filtrirani prikaz postojeće kategorije.
 * - Ne predstavlja zaseban SEO landing.
 * - Ne treba da se indeksira.
 * - Google i dalje sme da prati linkove ka proizvodima.
 *
 * Važno:
 * - Ako postoji posebna SEO grupa kao pravi URL, na primer:
 *
 *      /pages/products/tv-i-video/tv-nosaci/
 *
 *   to je posebna landing stranica i ne tretira se kao group filter.
 *
 * - group parametar ostaje tehnički filter:
 *
 *      ?group=tv-nosaci
 *
 *   i zato ostaje:
 *
 *      noindex, follow
 *
 * ============================================================
 * BLOK 5) KADA SE SKRIPTA IZVRŠAVA
 * ============================================================
 *
 * Skripta se pokreće u četiri slučaja:
 *
 * 1) Prvi load stranice
 *
 *      syncSeoMeta()
 *
 * 2) Browser navigacija
 *
 *      back / forward
 *      preko:
 *      window.addEventListener("popstate", syncSeoMeta)
 *
 * 3) Kada JavaScript promeni URL preko:
 *
 *      history.pushState()
 *
 * 4) Kada JavaScript promeni URL preko:
 *
 *      history.replaceState()
 *
 * Zbog toga se canonical, robots i title ponovo sinhronizuju svaki put
 * kada se promeni URL bez klasičnog reload-a stranice.
 *
 * ============================================================
 * BLOK 6) ARHITEKTURA
 * ============================================================
 *
 * category-listing.js
 *      → render proizvoda
 *      → paginacija
 *      → sort
 *      → group filteri
 *      → menjanje URL parametara
 *
 * search.js
 *      → pretraga proizvoda
 *      → paginacija rezultata
 *
 * canonical-fix.js
 *      → SEO infrastruktura
 *      → canonical
 *      → robots
 *      → title za paginaciju
 *
 * ============================================================
 * BLOK 7) NAPOMENA ZA PROVERU
 * ============================================================
 *
 * Ovaj skript ne menja HTML fajl na disku.
 * On menja live DOM u browseru.
 *
 * Zato "View Source" može i dalje prikazivati početni HTML.
 *
 * Ispravno stanje treba proveravati u DevTools Console:
 *
 *      document.querySelector('link[rel="canonical"]').href
 *
 *      document.querySelector('meta[name="robots"]').content
 *
 *      document.title
 *
 * Primer očekivanog rezultata:
 *
 *      URL:
 *      /pages/products/tv-i-video/?page=2#sort=name-asc
 *
 *      canonical:
 *      https://kupify.rs/pages/products/tv-i-video/?page=2
 *
 *      robots:
 *      index, follow
 *
 *      title:
 *      TV i video - stranica 2 | KUPIFY.rs
 *
 * ============================================================
 * BLOK 8) KRATKO PRAVILO
 * ============================================================
 *
 * Obična paginacija:
 *
 *      ?page=2
 *      → canonical sa ?page=2
 *      → index, follow
 *      → title dobija "- stranica 2"
 *
 * Group filter:
 *
 *      ?group=...
 *      → canonical na osnovnu kategoriju
 *      → noindex, follow
 *      → ne pravi posebnu SEO stranicu
 *
 */

(function () {
  function syncSeoMeta() {
    const url = new URL(location.href);

    const page = url.searchParams.get("page");
    const pageNumber = Number(page);
    const isPaged = Number.isInteger(pageNumber) && pageNumber > 1;

    const group = url.searchParams.get("group");
    const hasGroup = group && group !== "all";

    // ========================================================
    // 1) CANONICAL
    // ========================================================
    let canonical = url.origin + url.pathname.replace(/\/?$/, "/");

    // paginacija ide u canonical SAMO ako nema group filtera
    if (!hasGroup && isPaged) {
      canonical += `?page=${pageNumber}`;
    }

    let canonicalLink = document.querySelector('link[rel="canonical"]');

    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }

    canonicalLink.href = canonical;

    // ========================================================
    // 2) ROBOTS
    // ========================================================
    let robotsMeta = document.querySelector('meta[name="robots"]');

    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.name = "robots";
      document.head.appendChild(robotsMeta);
    }

    let robotsContent = "index, follow";

    // group filteri ostaju noindex
    // obična paginacija ostaje index
    if (hasGroup) {
      robotsContent = "noindex, follow";
    }

    robotsMeta.setAttribute("content", robotsContent);

    // ========================================================
    // 3) TITLE ZA PAGINACIJU
    // ========================================================
    const cleanTitle = document.title
      .replace(/\s*-\s*stranica\s+\d+(?=\s*(\||$))/i, "")
      .trim();

    if (isPaged && !hasGroup) {
      if (cleanTitle.includes("|")) {
        document.title = cleanTitle.replace(
          /\s*\|\s*/,
          ` - stranica ${pageNumber} | `
        );
      } else {
        document.title = `${cleanTitle} - stranica ${pageNumber}`;
      }
    } else {
      document.title = cleanTitle;
    }
  }

  // prvi load
  syncSeoMeta();

  // back / forward
  window.addEventListener("popstate", syncSeoMeta);

  // hook pushState
  const originalPushState = history.pushState;
  history.pushState = function () {
    const result = originalPushState.apply(this, arguments);
    syncSeoMeta();
    return result;
  };

  // hook replaceState
  const originalReplaceState = history.replaceState;
  history.replaceState = function () {
    const result = originalReplaceState.apply(this, arguments);
    syncSeoMeta();
    return result;
  };
})();