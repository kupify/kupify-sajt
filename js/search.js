/*
 * search.js
 *
 * ============================================================
 * LEGENDA
 * ============================================================
 *
 * Svrha skripte:
 *
 * - Upravljanje pretragom proizvoda na sajtu
 * - Filtriranje proizvoda po upitu korisnika
 * - Rangiranje rezultata po relevantnosti
 * - Sortiranje rezultata
 * - Paginacija rezultata
 * - Render kartica proizvoda u grid-u
 *
 * Skripta radi potpuno client-side.
 * Pretraga koristi statički JSON indeks generisan tokom build procesa.
 *
 *
 * ============================================================
 * IZVOR PODATAKA
 * ============================================================
 *
 * Podaci dolaze iz:
 *
 *      /pages/search/index.json
 *
 * JSON sadrži indeks proizvoda za pretragu.
 *
 * primer strukture:
 *
 *      slug
 *      name
 *      brand
 *      category
 *      group
 *      price_rsd
 *      q_ascii   (normalizovan tekst za pretragu)
 *
 *
 * ============================================================
 * NORMALIZACIJA TEKSTA
 * ============================================================
 *
 * Tekst se normalizuje kako bi pretraga bila stabilna:
 *
 * - uklanjaju se dijakritici (č ć š ž đ → c c s z dj)
 * - koristi se lowercase
 * - separatori (- _ /) se pretvaraju u razmake
 *
 * Ovo omogućava:
 *
 * - unos bez dijakritika
 * - stabilno poređenje teksta
 * - tolerantnost na manje greške u kucanju
 *
 *
 * ============================================================
 * TOKENIZACIJA
 * ============================================================
 *
 * Tekst se deli na tokene (reči):
 *
 *      "HDMI kabl 2m"
 *      → ["hdmi", "kabl", "2m"]
 *
 * Tokeni se keširaju unapred radi brzine:
 *
 *      _tokens
 *      _nameTokens
 *      _brandTokens
 *      _slugTokens
 *      _catTokens
 *      _groupTokens
 *
 * Napomena:
 *
 * - tokenizacija se koristi za tekstualne upite
 * - SKU / model upiti koriste dodatni režim pretrage
 *
 *
 * ============================================================
 * SKU / MODEL UPITI
 * ============================================================
 *
 * Skripta ima poseban režim za pretragu modela i šifara proizvoda.
 *
 * primer:
 *
 *      TA-UC-PD20-01-W
 *      WM-42F-05
 *      CD271
 *
 * Kod ovakvih upita:
 *
 * - šifra se ne tretira samo kao skup reči
 * - već se proverava i kao celina
 *
 * Koristi se posebna normalizacija:
 *
 * - uklanjaju se razmaci i separatori (- _ /)
 * - tekst se svodi na mali format
 *
 * primer:
 *
 *      TA-UC-PD20-01-W → taucpd2001w
 *
 * Ako upit liči na SKU:
 *
 * - radi se direktan substring match nad slug, name, brand i q_ascii
 * - takav match ima jak prioritet u rezultatima
 *
 * Ovo sprečava probleme sa kratkim segmentima
 * (npr. završno slovo W ili B).
 *
 *
 * ============================================================
 * SINONIMI
 * ============================================================
 *
 * Pretraga koristi mapu sinonima.
 *
 * primer:
 *
 *      stalak → nosac, drzac
 *      kabl → kabel, zica
 *      tv → televizor
 *
 * Kada korisnik unese reč:
 *
 * - upit se proširuje sinonimima
 * - povećava se šansa da proizvod bude pronađen
 *
 *
 * ============================================================
 * SCORING REZULTATA
 * ============================================================
 *
 * Svaki proizvod dobija score (relevantnost).
 *
 * Osnovna pravila:
 *
 * - tačan token match → najveći score
 * - prefiks match → srednji score
 * - fuzzy match (≤1 greška) → manji score
 *
 * Dodatni boost:
 *
 * - name
 * - brand
 * - slug
 * - group
 * - category
 *
 * SKU logika:
 *
 * - ako upit liči na SKU / model šifru
 * - pokušava se direktan match cele šifre
 * - takav rezultat dobija jak prioritet
 *
 * Kratki tokeni (manje od 2 slova):
 *
 * - ne koriste se kao samostalni uslov u tekstualnoj pretrazi
 * - ignorišu se kako bi se sprečilo da jedno slovo vrati sve rezultate
 * - ne smeju da sruše match kod SKU upita
 *
 *
 * ============================================================
 * SORTIRANJE
 * ============================================================
 *
 * Podržani režimi:
 *
 *      relevance
 *      name-asc
 *      name-desc
 *      price-asc
 *      price-desc
 *
 * Sortiranje se čuva u hash delu URL-a:
 *
 *      #sort=name-asc
 *
 * Razlog:
 *
 * - ne utiče na canonical
 * - izbegava dupliranje URL parametara
 *
 *
 * ============================================================
 * PAGINACIJA
 * ============================================================
 *
 * Rezultati su paginirani:
 *
 *      /pages/search/?q=hdmi&page=2
 *
 * Paginator generiše linkove:
 *
 *      <a href="?q=hdmi&page=2">
 *
 * JavaScript presreće klik:
 *
 * - bez reload-a stranice
 * - renderuje rezultate client-side
 *
 *
 * ============================================================
 * URL PARAMETRI
 * ============================================================
 *
 * Pretraga koristi:
 *
 *      q     → upit
 *      page  → stranica
 *      sort  → način sortiranja (u hash-u)
 *
 * primer:
 *
 *      /pages/search/?q=hdmi&page=2#sort=name-asc
 *
 *
 * ============================================================
 * STATE APLIKACIJE
 * ============================================================
 *
 * Interno stanje:
 *
 *      state.items
 *      state.filtered
 *      state.q
 *      state.q_ascii
 *      state.sort
 *      state.page
 *      state.pageSize
 *
 * Svaka promena pokreće:
 *
 *      render()
 *
 *
 * ============================================================
 * ARHITEKTURA SISTEMA
 * ============================================================
 *
 * category-listing.js
 *      → listing proizvoda po kategoriji
 *
 * search.js
 *      → pretraga proizvoda
 *
 * canonical-fix.js
 *      → SEO canonical sinhronizacija
 *
 * Sve skripte rade client-side nad statičkim HTML sajtom.
 *
 *
 * ============================================================
 * PREDNOSTI OVOG SISTEMA
 * ============================================================
 *
 * - statički HTML
 * - brza pretraga
 * - nema baze
 * - nema server-side renderinga
 * - jednostavan build pipeline
 *
 * SEO ostaje stabilan jer:
 *
 * - proizvodi imaju statičke URL-ove
 * - paginator ima crawlable linkove
 * - canonical je pravilno sinhronizovan
 *
 */

(function () {
  "use strict";
  const qs = (s, r = document) => r.querySelector(s);

  // Normalizacija teksta: lowercase, uklanjanje dijakritika, -, _, / -> razmak
  const norm = (s) => (s || "")
    .toLowerCase()
    .replace(/[čćšžđ]/g, m => ({ 'č': 'c', 'ć': 'c', 'š': 's', 'ž': 'z', 'đ': 'dj' }[m]))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/]/g, " ");

  // Normalizacija SKU/model upita: uklanja razmake i separatore da bi šifra ostala celina
  function normalizeSku(s) {
    return (s || "")
      .toLowerCase()
      .replace(/[čćšžđ]/g, m => ({ 'č': 'c', 'ć': 'c', 'š': 's', 'ž': 'z', 'đ': 'dj' }[m]))
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s\-_/]+/g, "");
  }

  // Heuristika: da li upit liči na SKU/model šifru
  function looksLikeSkuQuery(q) {
    const raw = (q || "").trim();
    return /[0-9]/.test(raw) && /[-_/]/.test(raw);
  }

  // Cena u broju (za sortiranje)
  const priceVal = (p) => {
    const v = Number(p.price_rsd);
    return Number.isFinite(v) ? v : null;
  };

  // Sort logika
  function applySort(arr, key) {
    const data = arr.slice();
    switch (key) {
      case "name-asc":
        return data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "sr", { sensitivity: "base" }));
      case "name-desc":
        return data.sort((a, b) => (b.name || "").localeCompare(a.name || "", "sr", { sensitivity: "base" }));
      case "price-asc":
        return data.sort((a, b) => {
          const av = priceVal(a), bv = priceVal(b);
          if (av === null && bv === null) return 0; if (av === null) return 1; if (bv === null) return -1;
          return av - bv;
        });
      case "price-desc":
        return data.sort((a, b) => {
          const av = priceVal(a), bv = priceVal(b);
          if (av === null && bv === null) return 0; if (av === null) return 1; if (bv === null) return -1;
          return bv - av;
        });
      default: // relevance = redosled posle filtriranja
        return data;
    }
  }

  // HTML jedne kartice (isti markup/klase kao u kategorijama)
  function buildCardHTML(p) {
    const href = `/pages/products/${encodeURIComponent(p.category)}/${encodeURIComponent(p.slug)}/`;
    const img = p.img_thumb
      ? `<img class="product-img" src="${p.img_thumb}" alt="${p.name || ""}"
            loading="lazy" decoding="async" width="150" height="150"
            onerror="this.style.display='none';">`
      : "";
    const price = (() => {
      const v = priceVal(p);
      if (v === null) return "Na upit";
      return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " RSD";
    })();

    return `
    <article class="product-card">
      <a class="product-link" href="${href}">
        ${img}
        <h4 class="product-title">${p.name || ""}</h4>
        <p class="product-price">${price}</p>
        <span class="btn-ghost">Detaljnije</span>
      </a>
    </article>`;
  }

  // Render grida — poruka ide ispod <h2.section-title>, ne u grid
  function renderGrid(list, page, size) {
    const grid = qs(".products-grid");
    const section = grid.closest(".product-section") || document; // roditelj sekcije
    const title = section.querySelector("h2.section-title");

    const start = (page - 1) * size;
    const end = start + size;
    const chunk = list.slice(start, end);

    // Ukloni staru poruku ako postoji
    const oldMsg = section.querySelector(".no-products");
    if (oldMsg) oldMsg.remove();

    if (chunk.length) {
      grid.innerHTML = chunk.map(buildCardHTML).join("");
    } else {
      grid.innerHTML = ""; // prazan grid
      // Umetni poruku odmah posle naslova
      const msg = document.createElement("p");
      msg.className = "no-products";
      msg.textContent = "Nema rezultata za zadati upit.";
      if (title) {
        title.insertAdjacentElement("afterend", msg);
      } else {
        // fallback: ako nema <h2>, prikaži iznad grida
        grid.insertAdjacentElement("beforebegin", msg);
      }
    }
  }

  // Paginator
  function renderPaginator(total, page, size) {
    const nav = qs("#paginator");
    const pagesUl = nav?.querySelector(".pag-pages");
    const prevBtn = nav?.querySelector('.pag-btn[data-action="prev"]');
    const nextBtn = nav?.querySelector('.pag-btn[data-action="next"]');
    if (!nav || !pagesUl || !prevBtn || !nextBtn) return;

    const totalPages = Math.max(1, Math.ceil(total / size));

    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;

    const q = getURLParam("q", "");
    const sort = getHashParam("sort", "");

    pagesUl.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement("li");
      const a = document.createElement("a");

      a.textContent = String(i);
      a.setAttribute("aria-label", `Stranica ${i}`);

      const hash = sort ? `#sort=${sort}` : "";
      a.href = `?q=${encodeURIComponent(q)}&page=${i}${hash}`;

      if (i === page) {
        a.setAttribute("aria-current", "page");
      }

      li.appendChild(a);
      pagesUl.appendChild(li);
    }

    return totalPages;
  }

  // Kratki rezime iznad grida
  function updateSummary(q, total) {
    const el = qs("#search-summary");
    if (!el) return;
    el.textContent = q
      ? `Prikazano: ${total} rezultat(a) za “${q}”.`
      : `Unesite pojam u polje za pretragu.`;
  }

  // URL param helpers
  function getURLParam(k, def = "") {
    const u = new URL(location.href);
    return u.searchParams.get(k) ?? def;
  }
  function setURLParams(obj) {
    const u = new URL(location.href);

    // FORSIRAJ: sort ne sme u query nikad
    u.searchParams.delete("sort");

    Object.entries(obj).forEach(([k, v]) => {
      if (v == null || v === "") u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    });

    history.replaceState(null, "", u);
  }
  function getHashParam(k, def = "") {
    const h = (location.hash || "").replace(/^#/, "");
    const sp = new URLSearchParams(h);
    return sp.get(k) ?? def;
  }

  function setHashParams(obj) {
    const h = (location.hash || "").replace(/^#/, "");
    const sp = new URLSearchParams(h);
    Object.entries(obj).forEach(([k, v]) => {
      if (v == null || v === "") sp.delete(k);
      else sp.set(k, String(v));
    });
    const next = sp.toString();
    // ne koristi replaceState ovde; hash može direktno
    location.hash = next ? `#${next}` : "";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const sortSel = qs("#sort-select");
    const pageSizeAttr = Number(qs("#paginator")?.getAttribute("data-items-per-page") || "12") || 12;

    // inicijalni parametri iz URL-a
    const initialQ = getURLParam("q", "");
    const initialSort = getHashParam("sort", "relevance");
    const initialPage = Number(getURLParam("page", "1")) || 1;

    if (sortSel) sortSel.value = initialSort;

    // učitaj indeks pretrage
    let items = [];
    try {
      const res = await fetch("/pages/search/index.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      items = Array.isArray(data.items) ? data.items : [];
    } catch (e) {
      console.error("Neuspešno učitavanje indeksa pretrage:", e);
    }

    // 🔹 Keširaj tokene za bržu pretragu
    const tokenize = (s) => (s || "").replace(/[-_/]/g, " ").split(/\s+/).filter(Boolean);
    for (const it of items) {

      it._tokens = new Set(tokenize(it.q_ascii));

      // keširaj field tokene
      it._nameTokens = new Set(tokenize(norm(it.name)));
      it._brandTokens = new Set(tokenize(norm(it.brand)));
      it._slugTokens = new Set(tokenize(norm(it.slug)));
      it._catTokens = new Set(tokenize(norm(it.category)));
      it._groupTokens = new Set(tokenize(norm(it.group)));
    }

    const state = {
      items,
      filtered: [],
      q: initialQ,
      q_ascii: norm(initialQ),
      sort: initialSort,
      page: initialPage,
      pageSize: pageSizeAttr,
      totalPages: 1
    };

    // Mapa Sinonima
    const synonymMap = {

      // === TV / držači ===
      "stalak": ["nosac", "drzac", "postolje"],
      "nosac": ["stalak", "drzac", "postolje"],
      "drzac": ["stalak", "nosac", "postolje"],
      "postolje": ["stalak", "nosac", "drzac"],
      "polica": ["stalak", "nosac"],
      "rotirajuci": ["rotacioni"],
      "rotacioni": ["rotirajuci"],

      // === Kablovi / adapteri / napajanja ===
      "adapter": ["konektor", "pretvarac"],
      "kabl": ["kabel", "zica", "kabli"],
      "kabel": ["kabl", "zica", "kabli"],
      "kabli": ["kabl", "zica", "kabel"],
      "zica": ["kabl", "kabli", "kabel"],
      "punjac": ["napajanje", "adapter", "usb"],
      "napajanje": ["punjac", "adapter"],

      // === Računari / monitori ===
      "monitor": ["ekran", "display", "displej"],
      "ekran": ["monitor", "display", "displej"],
      "display": ["monitor", "ekran", "displej"],
      "displej": ["monitor", "ekran", "display"],
      "racunar": ["kompjuter", "pc"],
      "kompjuter": ["racunar", "pc"],
      "pc": ["kompjuter", "racunar"],
      "laptop": ["notebook"],
      "notebook": ["laptop"],
      "flash": ["fles"],
      "fles": ["flash"],


      // === TV sinonimi ===
      "tv": ["televizor"],
      "televizor": ["tv"],
      "spoljna": ["spoljasna"],
      "spoljasna": ["spoljna"],
      "sobna": ["unutrasnja"],
      "unutrasnja": ["sobna"],
      "pojacivac": ["pojacalo", "pojacavac"],
      "pojacavac": ["pojacalo", "pojacivac"],
      "pojacalo": ["pojacavac", "pojacivac"],

      // === Elektrika / elektronika ===
      "uticnica": ["steker"],
      "utikac": ["steker"],
      "steker": ["uticnica", "utikac"],

      // === Automobili ===
      "auto": ["kola", "automobil"],
      "kola": ["auto", "automobil"],
      "automobil": ["auto", "kola"],

      // === Telefoni ===
      "telefon": ["mobilni", "smartphone", "smartfon"],
      "mobilni": ["telefon", "smartphone", "smartfon"],
      "smartphone": ["telefon", "mobilni", "smartfon"],
      "smartfon": ["telefon", "mobilni", "smartphone"],

    };

    function applyFilter() {
      // 1) bez upita → prazno
      if (!state.q_ascii) {
        state.filtered = [];
        state.page = 1;
        state.totalPages = 1;
        return;
      }

      function expandGroup(term) {
        const group = new Set([term]);
        if (synonymMap[term]) for (const s of synonymMap[term]) group.add(s);
        return Array.from(group);
      }

      // tolerancija na 1 grešku (edit distance ≤ 1) + prefiks fast-path
      function nearMatch1(pat, tok) {
        const a = pat, b = tok;
        const la = a.length, lb = b.length;
        const d = Math.abs(la - lb);
        if (d > 1) return false;
        if (b.startsWith(a)) return true;

        if (la === lb) {
          let diff = 0;
          for (let i = 0; i < la; i++) {
            if (a[i] !== b[i] && ++diff > 1) return false;
          }
          return diff === 1;
        }
        if (la > lb) return nearMatch1(b, a);

        let i = 0, j = 0, used = false;
        while (i < la && j < lb) {
          if (a[i] === b[j]) { i++; j++; continue; }
          if (used) return false;
          used = true;
          j++;
        }
        return true;
      }

      // scoring po tokenima
      function scoreMatch(g, tok) {
        if (tok === g) return 10;           // full token
        if (tok.startsWith(g)) return 6;    // prefiks
        if (nearMatch1(g, tok)) return 3;   // fuzzy ≤ 1
        return 0;
      }

      
      function scoreItem(item, groupsArr) {
        const tokens = item._tokens;
        const nameT = item._nameTokens;
        const brandT = item._brandTokens;
        const slugT = item._slugTokens;
        const catT = item._catTokens;
        const groupT = item._groupTokens;

        const querySku = normalizeSku(state.q);

        if (looksLikeSkuQuery(state.q) && querySku) {
          const skuFields = [
            item.slug,
            item.name,
            item.brand,
            item.q_ascii
          ].map(normalizeSku);

          if (skuFields.some(v => v.includes(querySku))) {
            return { ok: true, score: 1000 };
          }
        }

        let total = 0;
        for (const group of groupsArr) {
          let groupBest = 0;
          const usable = group.filter(g => g.length >= 2);  // search minimum 2 slova
          if (usable.length === 0) continue;

          for (const g of usable) {
            for (const tok of tokens) {
              const s = scoreMatch(g, tok);
              if (s > groupBest) groupBest = s;
            }
          }
          if (groupBest === 0) return { ok: false, score: 0 };

          let boost = 0;
          for (const g of usable) {
            if (nameT.has(g)) boost += 3;
            if (brandT.has(g)) boost += 3;
            if (slugT.has(g)) boost += 2;
            if (catT.has(g)) boost += 1;
            if (groupT.has(g)) boost += 2;
          }
          total += groupBest + boost;
        }
        return { ok: true, score: total };
      }

      // priprema upita
      const queryTerms = state.q_ascii.split(/\s+/).filter(Boolean);
      const queryGroups = queryTerms.map(expandGroup);

      // filtriranje neupotrebljivih grupa
      const usableGroups = queryGroups
        .map(group => group.filter(g => g.length >= 2))
        .filter(group => group.length > 0);

      // ako nije SKU upit i nema nijednog smislenog tokena -> nema rezultata
      if (!looksLikeSkuQuery(state.q) && usableGroups.length === 0) {
        state.filtered = [];
        state.page = 1;
        state.totalPages = 1;
        return;
      }

      // primena scoringa
      const scored = state.items.map(it => {
        const r = scoreItem(it, usableGroups);
        return r.ok ? { item: it, score: r.score } : null;
      }).filter(Boolean);

      if (state.sort === "relevance") {
        scored.sort((a, b) => b.score - a.score);
        state.filtered = scored.map(x => x.item);
      } else {
        const passed = scored.map(x => x.item);
        state.filtered = applySort(passed, state.sort);
      }

      // paginacija
      const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
      if (state.page > maxPage) state.page = 1;
      state.totalPages = maxPage;
    }

    function render() {
      applyFilter();
      renderGrid(state.filtered, state.page, state.pageSize);
      renderPaginator(state.filtered.length, state.page, state.pageSize);
      updateSummary(state.q, state.filtered.length);
      document.body.classList.remove("js-hidden");
    }

    // Paginator događaji
    (function attachPagination() {
      const nav = qs("#paginator");
      if (!nav) return;
      const prevBtn = nav.querySelector('.pag-btn[data-action="prev"]');
      const nextBtn = nav.querySelector('.pag-btn[data-action="next"]');
      const pagesUl = nav.querySelector(".pag-pages");
      const goto = (n) => {
        if (n < 1 || n > state.totalPages) return;
        state.page = n;
        setURLParams({ q: state.q, page: state.page, sort: "" }); // OBRIŠI sort iz query
        setHashParams({ sort: state.sort });                       // sort ide u hash
        render();
      };
      prevBtn?.addEventListener("click", () => goto(state.page - 1));
      nextBtn?.addEventListener("click", () => goto(state.page + 1));
      pagesUl?.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;

        e.preventDefault();

        const url = new URL(link.href);
        const n = Number(url.searchParams.get("page"));
        if (Number.isFinite(n)) goto(n);
      });
    })();

    // Sort događaj
    sortSel?.addEventListener("change", () => {
      state.sort = sortSel.value;
      state.page = 1;
      setURLParams({ q: state.q, page: 1, sort: "" }); // OBRIŠI sort iz query
      setHashParams({ sort: state.sort });
      render();
    });

    // Prvi render
    render();

    window.addEventListener("hashchange", () => {
      const s = getHashParam("sort", "relevance");
      if (s === state.sort) return;   // nema promene
      state.sort = s;
      if (sortSel) sortSel.value = s;
      render();
    });
  });

})();