// /js/ga4-blog-events.js
window.initBlogAnalytics = function () {
  "use strict";

  // stop if GA4 gtag isn't available (blocked, not loaded, consent, etc.)
  if (typeof gtag !== "function") return;

  function isTrackableHref(href) {
    if (!href) return false;
    const h = href.trim();
    if (h === "#" || h.startsWith("#")) return false;
    if (h.startsWith("javascript:")) return false;
    if (h.startsWith("mailto:") || h.startsWith("tel:")) return false;
    return true;
  }

  function isOutbound(href) {
    if (!href) return false;
    // absolute http(s) and not our host -> outbound
    return /^https?:\/\//i.test(href) && !href.includes(location.host);
  }

  // 1) Link clicks in blog text
  const blogText = document.querySelector(".tekst-blok-blog");
  if (blogText) {
    blogText.addEventListener(
      "click",
      function (e) {
        const a = e.target.closest("a");
        if (!a) return;

        const href = a.getAttribute("href") || "";
        if (!isTrackableHref(href)) return;

        const text = (a.textContent || "").trim().slice(0, 100);

        gtag("event", "blog_link_click", {
          link_text: text,
          link_url: href,
          link_type: isOutbound(href) ? "outbound" : "internal",
          page_path: location.pathname,
          page_title: document.title,
          transport_type: "beacon"
        });
      },
      { capture: true }
    );
  }

  // 2) CTA clicks
  const ctaZone = document.querySelector(".cta-zavrsni-blok-content");
  if (ctaZone) {
    ctaZone.addEventListener(
      "click",
      function (e) {
        const el = e.target.closest("a, button");
        if (!el) return;

        const href = el.getAttribute("href") || "";
        // allow button (no href), but filter junk href
        if (el.tagName.toLowerCase() === "a" && !isTrackableHref(href)) return;

        const label = (el.getAttribute("data-cta") || el.textContent || "")
          .trim()
          .slice(0, 100);

        gtag("event", "blog_cta_click", {
          cta_label: label,
          link_url: href,
          element_type: el.tagName.toLowerCase(),
          page_path: location.pathname,
          page_title: document.title,
          transport_type: "beacon"
        });
      },
      { capture: true }
    );
  }
};
