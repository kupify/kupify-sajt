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
 * - Sprečava da sve paginirane stranice kanonizuju na page 1.
 *
 * Zašto je ovo potrebno:
 * - Paginacija na Kupify sajtu se menja client-side (JS).
 * - URL se menja preko history.pushState / replaceState.
 * - Canonical u HTML fajlu ostaje statičan.
 * - Bez ovog skripta canonical bi uvek ostao isti (page 1).
 *
 * Šta skripta radi:
 *
 * 1) Čita trenutni URL
 *    npr:
 *      /pages/products/tv-i-video/
 *      /pages/products/tv-i-video/?page=2
 *
 * 2) Formira canonical URL
 *    pravila:
 *
 *      page 1  → canonical = osnovni URL
 *      page 2+ → canonical = URL sa ?page=
 *
 *    primer:
 *
 *      /tv-i-video/        → canonical /tv-i-video/
 *      /tv-i-video/?page=2 → canonical /tv-i-video/?page=2
 *
 * 3) Ignoriše hash parametre
 *
 *      ?page=2#sort=name-asc
 *
 *    canonical postaje:
 *
 *      ?page=2
 *
 *    jer Google ignoriše hash deo URL-a.
 *
 * 4) Ažurira canonical u DOM-u
 *
 *      <link rel="canonical">
 *
 *    ako postoji → menja href
 *    ako ne postoji → kreira element
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
 *    automatski ponovo sinhronizuje canonical.
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
 *      → canonical sinhronizacija
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
 *
 * što znači:
 *
 *      page 2 = duplikat page 1
 *
 * Sa skriptom:
 *
 *      /tv-i-video/?page=2
 *      canonical → /tv-i-video/?page=2
 *
 * što omogućava pravilno indeksiranje paginacije.
 *
 *
 * ============================================================
 * BLOK 4) NAPOMENA
 * ============================================================
 *
 * Ovaj skript ne menja HTML fajl na disku.
 * On menja canonical u live DOM-u browsera.
 *
 * "View Source" može i dalje pokazivati
 * originalni canonical iz HTML-a.
 *
 * Pravi canonical treba proveravati preko:
 *
 *      document.querySelector('link[rel="canonical"]').href
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