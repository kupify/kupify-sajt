/*
 * canonical-fix.js
 *
 * ============================================================
 * BLOK 0) LEGENDA
 * ============================================================
 *
 * Svrha skripte:
 * - Sinhronizuje <link rel="canonical"> sa trenutnim URL-om kada
 *   stranica koristi paginaciju (?page=).
 * - Automatski dodaje i ažurira <meta name="robots"> za paginaciju.
 * - Sprečava da sve paginirane stranice kanonizuju na page 1.
 *
 * Zašto je ovo potrebno:
 * - Paginacija na Kupify sajtu se menja client-side (JS).
 * - URL se menja preko history.pushState / replaceState.
 * - Canonical u HTML fajlu ostaje statičan.
 * - Robots meta u HTML-u ne postoji ili je statičan.
 *
 * Bez ovog skripta:
 *
 *      canonical → uvek page 1
 *      robots    → ne postoji ili pogrešan
 *
 * što znači:
 *
 *      paginacija = duplikat sadržaja
 *      loša distribucija SEO signala
 *
 *
 * Šta skripta radi:
 *
 * 1) Čita trenutni URL
 *
 *      /pages/products/tv-i-video/
 *      /pages/products/tv-i-video/?page=2
 *
 * 2) Formira canonical URL
 *
 *      pravila:
 *
 *      page 1  → canonical = osnovni URL
 *      page 2+ → canonical = URL sa ?page=
 *
 *      primer:
 *
 *      /tv-i-video/        → canonical /tv-i-video/
 *      /tv-i-video/?page=2 → canonical /tv-i-video/?page=2
 *
 * 3) Postavlja robots meta
 *
 *      pravila:
 *
 *      page 1  → index, follow
 *      page 2+ → noindex, follow
 *
 *      primer:
 *
 *      /tv-i-video/        → index, follow
 *      /tv-i-video/?page=2 → noindex, follow
 *
 * 4) Ignoriše hash parametre
 *
 *      ?page=2#sort=name-asc
 *
 *      canonical postaje:
 *
 *      ?page=2
 *
 *      jer Google ignoriše hash deo URL-a.
 *
 * 5) Ažurira DOM elemente
 *
 *      <link rel="canonical">
 *      <meta name="robots">
 *
 *      ako postoje → menja vrednosti
 *      ako ne postoje → kreira elemente
 *
 *
 * ============================================================
 * BLOK 1) KADA SE SKRIPTA IZVRŠAVA
 * ============================================================
 *
 * Skripta se pokreće u tri slučaja:
 *
 * 1) prvi load stranice
 *
 * 2) browser navigacija
 *      back / forward
 *
 * 3) kada JS promeni URL preko:
 *
 *      history.pushState()
 *      history.replaceState()
 *
 *    skripta hookuje ove metode i
 *    automatski ponovo sinhronizuje:
 *
 *      canonical
 *      robots
 *
 *
 * ============================================================
 * BLOK 2) ARHITEKTURA
 * ============================================================
 *
 * category-listing.js
 *      → render proizvoda
 *      → paginacija
 *      → URL parametri
 *
 * search.js
 *      → pretraga proizvoda
 *      → paginacija
 *
 * canonical-fix.js
 *      → SEO infrastruktura
 *      → canonical + robots sinhronizacija
 *
 *
 * ============================================================
 * BLOK 3) ZAŠTO JE OVO BITNO
 * ============================================================
 *
 * Bez ovog skripta Google bi video:
 *
 *      /tv-i-video/?page=2
 *      canonical → /tv-i-video/
 *      robots    → index (ili ništa)
 *
 * što znači:
 *
 *      page 2 = duplikat page 1
 *      konkurencija između stranica
 *      razvodnjavanje ranking signala
 *
 * Sa skriptom:
 *
 *      /tv-i-video/?page=2
 *      canonical → /tv-i-video/?page=2
 *      robots    → noindex, follow
 *
 * što znači:
 *
 *      Google NE indeksira page 2
 *      ali prati linkove ka proizvodima
 *      sav SEO signal ostaje na page 1
 *
 *
 * ============================================================
 * BLOK 4) NAPOMENA
 * ============================================================
 *
 * Ovaj skript ne menja HTML fajl na disku.
 * On menja canonical i robots u live DOM-u browsera.
 *
 * "View Source" može i dalje pokazivati
 * originalni canonical ili nedostatak robots meta taga.
 *
 * Pravo stanje treba proveravati U DevMode Console preko:
 *
 *      document.querySelector('link[rel="canonical"]').href
 *      document.querySelector('meta[name="robots"]').content
 *
 */


(function () {
  function syncCanonical() {
    const url = new URL(location.href);
    const page = url.searchParams.get("page");

    let canonical = url.origin + url.pathname;

    if (page && page !== "1") {
      canonical += `?page=${page}`;
    }

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }

    link.href = canonical;
  }

  // prvi load
  syncCanonical();

  // back/forward
  window.addEventListener("popstate", syncCanonical);

  // hook pushState
  const originalPushState = history.pushState;
  history.pushState = function () {
    const result = originalPushState.apply(this, arguments);
    syncCanonical();
    return result;
  };

  // hook replaceState
  const originalReplaceState = history.replaceState;
  history.replaceState = function () {
    const result = originalReplaceState.apply(this, arguments);
    syncCanonical();
    return result;
  };
})();