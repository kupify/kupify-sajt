/*
 * category-listing.js
 *
 * ============================================================
 * BLOK 0) LEGENDA
 * ============================================================
 *
 * Svrha skripte:
 * - Upravljanje prikazom proizvoda unutar kategorije.
 * - Render grid-a kartica proizvoda.
 * - Sortiranje proizvoda.
 * - Paginacija proizvoda.
 * - Sinhronizacija URL parametara sa stanjem stranice.
 *
 * Skripta radi potpuno client-side.
 * Podaci o proizvodima dolaze iz JSON fajla generisanog u build procesu.
 *
 *
 * ============================================================
 * BLOK 1) ŠTA SKRIPTA RADI
 * ============================================================
 *
 * 1) Učitava JSON indeks proizvoda
 *
 *    primer:
 *
 *    /pages/products/index.json
 *
 * 2) Filtrira proizvode po kategoriji
 *
 *    primer:
 *
 *    CATEGORY = "tv-i-video"
 *
 * 3) Sortira proizvode
 *
 *    podržani režimi:
 *
 *      name-asc
 *      name-desc
 *      price-asc
 *      price-desc
 *
 * 4) Renderuje kartice proizvoda
 *
 *    HTML kartice se generišu dinamički u grid kontejner:
 *
 *      .products-grid
 *
 * 5) Generiše paginator
 *
 *    broj proizvoda po stranici:
 *
 *      data-items-per-page
 *
 *    primer:
 *
 *      12 proizvoda po stranici
 *
 * 6) Sinhronizuje stanje sa URL-om
 *
 *    koristi dva tipa parametara:
 *
 *      ?page=
 *      #sort=
 *
 *
 * ============================================================
 * BLOK 2) URL STRUKTURA
 * ============================================================
 *
 * Kategorija:
 *
 *      /pages/products/tv-i-video/
 *
 * Paginacija:
 *
 *      /pages/products/tv-i-video/?page=2
 *
 * Sortiranje:
 *
 *      /pages/products/tv-i-video/#sort=name-asc
 *
 * Kombinacija:
 *
 *      /pages/products/tv-i-video/?page=2#sort=name-asc
 *
 *
 * ============================================================
 * BLOK 3) ZAŠTO SE KORISTI HASH ZA SORT
 * ============================================================
 *
 * Sortiranje se čuva u hash delu URL-a:
 *
 *      #sort=name-asc
 *
 * Razlog:
 *
 * - hash ne utiče na canonical URL
 * - Google ignoriše hash
 * - sprečava se dupliranje URL-ova
 *
 * Primer canonical:
 *
 *      /tv-i-video/?page=2
 *
 * čak i kada URL izgleda:
 *
 *      /tv-i-video/?page=2#sort=name-asc
 *
 *
 * ============================================================
 * BLOK 4) PAGINACIJA
 * ============================================================
 *
 * Paginator generiše klikabilne linkove:
 *
 *      <a href="?page=2">
 *
 * Ovo omogućava:
 *
 * - crawlable linkove za search engine
 * - pravilno indeksiranje paginiranih stranica
 *
 * JavaScript presreće klik kako bi:
 *
 * - sprečio reload stranice
 * - ažurirao prikaz proizvoda client-side
 *
 *
 * ============================================================
 * BLOK 5) STANJE APLIKACIJE (STATE)
 * ============================================================
 *
 * Skripta održava interno stanje:
 *
 *      state.items
 *      state.filtered
 *      state.sort
 *      state.currentPage
 *      state.pageSize
 *
 * Promena stanja pokreće:
 *
 *      update(state)
 *
 * što ponovo renderuje grid i paginator.
 *
 *
 * ============================================================
 * BLOK 6) ODNOS SA DRUGIM SKRIPTAMA
 * ============================================================
 *
 * category-listing.js
 *      → kategorije
 *      → render proizvoda
 *      → paginacija
 *
 * search.js
 *      → pretraga proizvoda
 *
 * canonical-fix.js
 *      → canonical SEO sinhronizacija
 *
 *
 * ============================================================
 * BLOK 7) ZAŠTO JE OVA ARHITEKTURA DOBRA
 * ============================================================
 *
 * Prednosti:
 *
 * - statički HTML
 * - brz rendering
 * - jednostavan build sistem
 * - nema baze
 * - nema server-side logike
 *
 * SEO je očuvan jer:
 *
 * - proizvodi imaju statičke URL-ove
 * - paginator ima prave linkove
 * - canonical je sinhronizovan
 *
 *
 * ============================================================
 * BLOK 8) BUDUĆE MOGUĆNOSTI
 * ============================================================
 *
 * Skripta omogućava lako dodavanje:
 *
 * - GROUP filtera (antene, tv-nosači, itd.)
 * - pagination optimizacije
 * - lazy render
 * - dodatnih filtera
 *
 * bez promene osnovne arhitekture.
 *
 */

(function () {
  "use strict";

  // —— helpers ——
  const qs = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const param = (k, d = null) => {
    const u = new URL(location.href);
    const v = u.searchParams.get(k);
    return v ?? d;
  };
  const setParams = (obj) => {
    const u = new URL(location.href);
    u.searchParams.delete("sort");
    Object.entries(obj).forEach(([k, v]) => {
      if (v == null || v === "" || v === 1) u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    });
    history.pushState(Object.fromEntries(u.searchParams), "", u);
  };
  const hparam = (k, d = null) => {
    const h = (location.hash || "").replace(/^#/, "");
    const sp = new URLSearchParams(h);
    const v = sp.get(k);
    return v ?? d;
  };

  const setHash = (obj) => {
    const h = (location.hash || "").replace(/^#/, "");
    const sp = new URLSearchParams(h);
    Object.entries(obj).forEach(([k, v]) => {
      if (v == null || v === "") sp.delete(k);
      else sp.set(k, String(v));
    });
    const next = sp.toString();
    location.hash = next ? `#${next}` : "";
  };

  // ADD: aria-busy helper za postojeći .products-grid (bez menjanja markupa)
  const getGrid = () => document.querySelector(".products-grid");
  const setBusy = (on) => {
    const grid = getGrid();
    if (!grid) return;
    grid.setAttribute("aria-busy", on ? "true" : "false");
  };

  function getCategoryFromPath() {
    const parts = location.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("products");
    return (i !== -1 && parts[i + 1]) ? decodeURIComponent(parts[i + 1]) : null;
  }

  function formatPriceRSD(val) {
    if (val === null || val === undefined || val === "" || isNaN(val)) return "Na upit";
    const n = Math.round(Number(val));
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " RSD";
  }

  // —— sorting ——
  function cmpName(a, b, dir = 1) {
    return dir * ((a.name || "").localeCompare(b.name || "", "sr", { sensitivity: "base" }));
  }
  function priceVal(p) {
    const v = Number(p.price_rsd);
    return Number.isFinite(v) ? v : null;
  }
  function cmpPriceAsc(a, b) {
    const av = priceVal(a), bv = priceVal(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;   // bez cene ide NA KRAJ
    if (bv === null) return -1;
    return av - bv;
  }
  function cmpPriceDesc(a, b) {
    const av = priceVal(a), bv = priceVal(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;   // bez cene ide NA KRAJ
    if (bv === null) return -1;
    return bv - av;
  }
  function applySort(arr, sortKey) {
    const list = arr.slice();
    switch (sortKey) {
      case "name-asc": list.sort((a, b) => cmpName(a, b, +1)); break;
      case "name-desc": list.sort((a, b) => cmpName(a, b, -1)); break;
      case "price-asc": list.sort(cmpPriceAsc); break;
      case "price-desc": list.sort(cmpPriceDesc); break;
      default: /* zadrži ulazni poredak (npr. već abecedno iz build-a) */ break;
    }
    return list;
  }

  function buildCardHTML(p, category) {
    const name = p.name || "";
    const href = `/pages/products/${encodeURIComponent(category)}/${encodeURIComponent(p.slug)}/`;
    const price = formatPriceRSD(p.price_rsd);
    const img = p.img_thumb || "";
    const imgTag = img
      ? `<img class="product-img" src="${img}" alt="${esc(name)}" loading="lazy" decoding="async" width="150" height="150" onerror="this.style.display='none';">`
      : "";
    return `
      <article class="product-card">
        <a href="${href}" class="product-link">
          ${imgTag}
          <h3 class="product-title">${esc(name)}</h3>
          <p class="product-price">${price}</p>
          <span class="btn-cta btn-ghost">Detaljnije</span>
        </a>
      </article>`;
  }

  function renderGrid(products, category, currentPage, pageSize) {
    const grid = qs(".products-grid");
    if (!grid) return;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const chunk = products.slice(start, end);
    grid.innerHTML = chunk.length
      ? chunk.map(p => buildCardHTML(p, category)).join("\n")
      : `<p style="padding:1rem;">Trenutno nema proizvoda za prikaz.</p>`;
  }

  function renderPaginator(totalItems, currentPage, pageSize) {
    const nav = qs("#paginator");
    if (!nav) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const prevBtn = nav.querySelector('.pag-btn[data-action="prev"]');
    const nextBtn = nav.querySelector('.pag-btn[data-action="next"]');
    const pagesUl = nav.querySelector(".pag-pages");

    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    if (pagesUl) {
      pagesUl.innerHTML = "";

      for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement("li");
        const a = document.createElement("a");

        a.textContent = String(i);
        const sp = new URLSearchParams();
        const sort = hparam("sort");
        if (sort) sp.set("sort", sort);
        a.href = `?page=${i}${sp.toString() ? "#" + sp.toString() : ""}`;
        a.setAttribute("aria-label", `Stranica ${i}`);

        if (i === currentPage) {
          a.setAttribute("aria-current", "page");
        }

        li.appendChild(a);
        pagesUl.appendChild(li);
      }
    }
    return totalPages;
  }

  function ensureSortUI(state) {
    let select = document.getElementById("sort-select");
    if (!select) {
      // ubaci malu kontrolu odmah ispod H2 naslova (ako fali)
      const h2 = qs(".section-title") || qs(".products-grid");
      if (h2) {
        const wrap = document.createElement("div");
        wrap.className = "listing-controls";
        wrap.style.display = "flex";
        wrap.style.gap = ".5rem";
        wrap.style.alignItems = "center";
        wrap.style.margin = "0 0 1rem 0";
        wrap.innerHTML = `
          <label for="sort-select">Sortiraj:</label>
          <select id="sort-select">
            <option value="name-asc">Naziv A–Š</option>
            <option value="name-desc">Naziv Š–A</option>
            <option value="price-asc">Cena rastuće</option>
            <option value="price-desc">Cena opadajuće</option>
          </select>`;
        h2.insertAdjacentElement("afterend", wrap);
        select = wrap.querySelector("#sort-select");
      }
    }
    if (select) {
      select.value = state.sort;
      select.addEventListener("change", () => {
        state.sort = select.value;
        state.currentPage = 1; // reset paginacije na promenu sorta
        setParams({ page: 1 });
        setHash({ sort: state.sort });
        update(state);
      });
    }
  }

  function attachHandlers(state) {
    const nav = qs("#paginator");
    if (!nav) return;

    const prevBtn = nav.querySelector('.pag-btn[data-action="prev"]');
    const nextBtn = nav.querySelector('.pag-btn[data-action="next"]');
    const pagesUl = nav.querySelector(".pag-pages");

    const goto = (n) => {
      if (n < 1 || n > state.totalPages) return;
      state.currentPage = n;
      setParams({ page: n });
      setHash({ sort: state.sort });
      update(state);
    };

    if (prevBtn) {
      prevBtn.addEventListener("click", () => goto(state.currentPage - 1));
      prevBtn.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); prevBtn.click(); } });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => goto(state.currentPage + 1));
      nextBtn.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nextBtn.click(); } });
    }
    if (pagesUl) {
      pagesUl.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;

        e.preventDefault();

        const url = new URL(link.href);
        const n = Number(url.searchParams.get("page"));
        if (Number.isFinite(n)) goto(n);
      });

      pagesUl.addEventListener("keydown", (e) => {
        const link = e.target.closest("a");
        if (link && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          link.click();
        }
      });
    }

    // back/forward + sort u URL-u
    window.addEventListener("popstate", () => {
      const p = Number(param("page", "1")) || 1;
      const s = hparam("sort", state.sort) || state.sort;
      let needs = false;
      if (p !== state.currentPage) { state.currentPage = p; needs = true; }
      if (s !== state.sort) { state.sort = s; needs = true; }
      if (needs) update(state, { scroll: false });
    });
  }

  function update(state, opts = { scroll: true }) {
    setBusy(true); // ADD

    // primeni sortiranje
    const sorted = applySort(state.products, state.sort);
    state.totalPages = Math.max(1, Math.ceil(sorted.length / state.pageSize));
    if (state.currentPage > state.totalPages) {
      state.currentPage = 1;
    }

    // render
    renderGrid(sorted, state.category, state.currentPage, state.pageSize);
    renderPaginator(sorted.length, state.currentPage, state.pageSize);

    // skini .js-hidden sa <body> ako postoji
    document.body?.classList?.remove("js-hidden");

    if (opts.scroll !== false) {
      const anchor = qs(".breadcrumb") || qs("main");
      if (anchor) window.scrollTo({ top: anchor.offsetTop || 0, behavior: "smooth" });
    }

    // skini busy tek posle reflow-a
    requestAnimationFrame(() => setBusy(false)); // ADD
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const category = getCategoryFromPath();
    const grid = qs(".products-grid");
    const nav = qs("#paginator");
    if (!category || !grid || !nav) return;

    const initialSort = hparam("sort", "name-asc"); // podrazumevano: naziv A–Š
    const initialPage = Number(param("page", "1")) || 1;

    try {
      setBusy(true); // ADD

      const res = await fetch(`/pages/products/${encodeURIComponent(category)}/cards/data.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const products = Array.isArray(data.products) ? data.products : [];
      const pageSize = 18;

      const state = {
        category,
        products,
        pageSize,
        currentPage: initialPage,
        sort: initialSort,
        totalPages: Math.max(1, Math.ceil(products.length / pageSize)),
      };

      ensureSortUI(state);
      update(state, { scroll: false });
      attachHandlers(state);
    } catch (err) {
      console.error("Neuspešno učitavanje data.json:", err);

      const grid = document.querySelector(".products-grid");
      const section = grid?.closest(".product-section") || document;
      const title = section.querySelector("h2.section-title");

      // 1) očisti grid
      if (grid) grid.innerHTML = "";

      // 2) ukloni stari alert (ako postoji)
      const oldAlert = section.querySelector('p[role="alert"]');
      if (oldAlert) oldAlert.remove();

      // 3) napravi i ubaci alert odmah ispod H2
      const alert = document.createElement("p");
      alert.setAttribute("role", "alert");
      alert.className = "section-alert"; // stilizuj klasom umesto inline style-a
      alert.textContent = "Trenutno ne možemo da učitamo proizvode. Pokušajte kasnije.";

      if (title) {
        title.insertAdjacentElement("afterend", alert);
      } else if (grid) {
        grid.insertAdjacentElement("beforebegin", alert); // fallback
      } else {
        document.body.prepend(alert); // poslednji fallback
      }

      document.body.classList.remove("js-hidden");
      setBusy(false);
    }
  });
})();
