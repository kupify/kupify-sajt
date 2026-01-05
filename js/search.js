(function () {
  "use strict";
  const qs = (s, r = document) => r.querySelector(s);

  // Normalizacija (č/ć/š/ž/đ -> c/c/s/z/dj) + lowercase + dash
  const norm = (s) => (s || "")
    .toLowerCase()
    .replace(/[čćšžđ]/g, m => ({ 'č': 'c', 'ć': 'c', 'š': 's', 'ž': 'z', 'đ': 'dj' }[m]))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/]/g, " ");

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
        <span class="btn-cta btn-ghost">Detaljnije</span>
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

    pagesUl.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.textContent = String(i);
      if (i === page) b.setAttribute("aria-current", "page");
      li.appendChild(b);
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
    Object.entries(obj).forEach(([k, v]) => {
      if (v == null || v === "") u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    });
    history.replaceState(null, "", u);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const sortSel = qs("#sort-select");
    const pageSizeAttr = Number(qs("#paginator")?.getAttribute("data-items-per-page") || "12") || 12;

    // inicijalni parametri iz URL-a
    const initialQ = getURLParam("q", "");
    const initialSort = getURLParam("sort", "relevance");
    const initialPage = Number(getURLParam("page", "1")) || 1;

    if (sortSel) sortSel.value = initialSort;

    // učitaj indeks pretrage
    let items = [];
    try {
      const res = await fetch("/pages/search/index.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      items = Array.isArray(data.items) ? data.items : [];
    } catch (e) {
      console.error("Neuspešno učitavanje indeksa pretrage:", e);
    }

    // 🔹 Keširaj tokene za bržu pretragu
    const tokenize = (s) => (s || "").replace(/[-_/]/g, " ").split(/\s+/).filter(Boolean);
    for (const it of items) {
      it._tokens = new Set(tokenize(it.q_ascii));  // gotovi tokeni za svaku stavku
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

      function hayTokens(hayRaw) {
        return (hayRaw || "")
          .replace(/[-_/]/g, " ")
          .split(/\s+/)
          .filter(Boolean);
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

      // 4) scoring
      function scoreMatch(g, tok) {
        if (tok === g) return 10;           // full token
        if (tok.startsWith(g)) return 6;    // prefiks
        if (nearMatch1(g, tok)) return 3;   // fuzzy ≤ 1
        return 0;
      }

      function fieldTokens(item) {
        const nameT = new Set(hayTokens(norm(item.name)));
        const brandT = new Set(hayTokens(norm(item.brand)));
        const slugT = new Set(hayTokens(norm(item.slug)));
        const catT = new Set(hayTokens(norm(item.category)));
        return { nameT, brandT, slugT, catT };
      }

      function scoreItem(item, groupsArr) {
        const hay = item.q_ascii || "";
        const tokens = item._tokens || new Set(hayTokens(hay));
        const { nameT, brandT, slugT, catT } = fieldTokens(item);

        let total = 0;
        for (const group of groupsArr) {
          let groupBest = 0;
          const usable = group.filter(g => g.length >= 2);  // search minimum 2 slova
          if (usable.length === 0) return { ok: false, score: 0 };

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
          }
          total += groupBest + boost;
        }
        return { ok: true, score: total };
      }

      // 5) priprema upita (jedinstvene promenljive, nema duplikata!)
      const queryTerms = state.q_ascii.split(/\s+/).filter(Boolean);
      const queryGroups = queryTerms.map(expandGroup);

      // 6) primeni scoring
      const scored = state.items.map(it => {
        const r = scoreItem(it, queryGroups);
        return r.ok ? { item: it, score: r.score } : null;
      }).filter(Boolean);

      if (state.sort === "relevance") {
        scored.sort((a, b) => b.score - a.score);
        state.filtered = scored.map(x => x.item);
      } else {
        const passed = scored.map(x => x.item);
        state.filtered = applySort(passed, state.sort);
      }

      // 7) paginacija
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
        setURLParams({ q: state.q, sort: state.sort, page: state.page });
        render();
      };
      prevBtn?.addEventListener("click", () => goto(state.page - 1));
      nextBtn?.addEventListener("click", () => goto(state.page + 1));
      pagesUl?.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const n = Number(b.textContent);
        if (Number.isFinite(n)) goto(n);
      });
    })();

    // Sort događaj
    sortSel?.addEventListener("change", () => {
      state.sort = sortSel.value;
      state.page = 1;
      setURLParams({ q: state.q, sort: state.sort, page: 1 });
      render();
    });

    // Prvi render
    render();
  });
})();