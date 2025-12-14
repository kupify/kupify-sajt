// /js/product-analytics.js
window.initProductAnalytics = function () {
  "use strict";

  function parseProductData() {
    try {
      const el = document.getElementById("ga-product");
      if (!el) return null;
      return JSON.parse(el.textContent || "{}");
    } catch (e) { return null; }
  }

  function toNumberRSD(s) {
    if (!s) return undefined;
    const n = Number(String(s).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }

  const data = parseProductData();
  if (!data || typeof gtag !== "function") return;

  const price = toNumberRSD(data.price);
  const item = {
    item_id: data.sku || data.slug,
    item_name: data.name,
    item_category: data.category_name || data.category,
    price: price
  };

  // 1) Prikaz proizvoda (GA4)
  gtag('event', 'view_item', {
    currency: 'RSD',
    value: price,
    items: [item]
  });

  // 2) CTA: Viber klik
  const viberBtn = document.querySelector(".product-page-cta-button-1");
  if (viberBtn) {
    viberBtn.addEventListener("click", function (e) {
      e.preventDefault();

      gtag('event', 'cta_click', {
        cta: 'viber',
        page_section: 'product',
        item_name: data.name,
        item_category: item.item_category
      });

      setTimeout(() => {
        window.location.href = viberBtn.href;
      }, 200);
    }, { once: true });
  }

  // 3) CTA: KP klik
  const kpBtn = document.querySelector(".product-page-cta-button-2");
  if (kpBtn) {
    kpBtn.addEventListener("click", function () {
      gtag('event', 'cta_click', {
        cta: 'kp',
        page_section: 'product',
        item_name: data.name,
        item_category: item.item_category
      });
    });
  }

  // 4) Galerija: klik na thumbnail
  document.querySelectorAll(".thumbnails img").forEach(function (img, idx) {
    img.addEventListener("click", function () {
      gtag('event', 'gallery_thumb_click', {
        item_name: data.name,
        item_category: item.item_category,
        thumb_index: idx + 1
      });
    });
  });
};
