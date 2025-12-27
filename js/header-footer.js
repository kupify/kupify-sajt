/* =========================================================
   KUPIFY header/footer + Anti-FOUC + Top loader + carousel
   ========================================================= */

(function () {
  "use strict";

  // -----------------------------
  // Top loader (thin bar at top)
  // -----------------------------
  const Loader = (() => {
    let el = null;
    let t = null;
    let progress = 0;
    let running = false;

    function ensure() {
      if (el) return el;
      el = document.getElementById("top-loader");
      return el;
    }

    function setWidth(pct) {
      const e = ensure();
      if (!e) return;
      e.style.width = Math.max(0, Math.min(100, pct)) + "%";
    }

    function show() {
      const e = ensure();
      if (!e) return;
      e.style.opacity = "1";
    }

    function hide() {
      const e = ensure();
      if (!e) return;
      e.style.opacity = "0";
      // malo kasnije reset na 0 da sledeći put krene lepo
      setTimeout(() => {
        if (!e) return;
        e.style.width = "0%";
      }, 250);
    }

    function start() {
      const e = ensure();
      if (!e) return;

      if (running) return;
      running = true;

      progress = 8;          // start odmah da se vidi
      show();
      setWidth(progress);

      // “fake” progres dok se učitava (nikad do 100 dok ne finish)
      t = setInterval(() => {
        if (progress < 75) progress += 6;
        else if (progress < 90) progress += 2;
        else if (progress < 96) progress += 0.7;
        setWidth(progress);
      }, 180);
    }

    function finish() {
      const e = ensure();
      if (!e) {
        running = false;
        return;
      }

      if (t) clearInterval(t);
      t = null;

      progress = 100;
      setWidth(progress);

      // fade out
      setTimeout(() => {
        hide();
        running = false;
      }, 180);
    }

    function fail() {
      // u fail varijanti samo skloni bar, bez filozofije
      if (t) clearInterval(t);
      t = null;
      hide();
      running = false;
    }

    return { start, finish, fail };
  })();

  // -----------------------------
  // Helpers
  // -----------------------------
  function getPrefixByPathDepth() {
    // /pages/products/xxx/ -> treba ../../../ da bi došao do root fajlova
    const depth = Math.max(0, window.location.pathname.split("/").length - 2);
    return "../".repeat(depth);
  }

  // -----------------------------
  // Sticky header logic (your existing)
  // -----------------------------
  function initScrollHeader() {
    const header = document.querySelector("header");
    if (!header) return;

    const nav = header.querySelector(".header-nav");
    const search = header.querySelector(".site-search");
    const paragraph = header.querySelector(".header-text p");
    if (!nav || !paragraph) return;

    let lastScroll = 0;

    const setVars = () => {
      const navH = nav.getBoundingClientRect().height || 48;
      document.documentElement.style.setProperty("--navH", navH + "px");

      if (search) {
        const sh = search.getBoundingClientRect().height || 56;
        document.documentElement.style.setProperty("--searchH", sh + "px");
      }
    };

    window.addEventListener(
      "scroll",
      () => {
        if (window.innerWidth > 768) return;

        const currentScroll = window.pageYOffset;

        if (currentScroll > lastScroll && currentScroll > 150) {
          header.classList.add("hide-logo");
        } else {
          header.classList.remove("hide-logo");
        }

        const paragraphRect = paragraph.getBoundingClientRect();
        const paragraphVisible = paragraphRect.bottom > 0;

        if (!paragraphVisible) {
          nav.classList.add("sticky");
          if (search) {
            search.classList.add("sticky");
            header.classList.add("has-sticky-search");
            setVars();
          }
        } else {
          nav.classList.remove("sticky");
          if (search) {
            search.classList.remove("sticky");
            header.classList.remove("has-sticky-search");
            document.documentElement.style.removeProperty("--navH");
            document.documentElement.style.removeProperty("--searchH");
          }
        }

        lastScroll = currentScroll;
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth <= 768 && nav.classList.contains("sticky")) {
          setVars();
        }
      },
      { passive: true }
    );
  }

  // -----------------------------
  // Header/footer loader + Anti-FOUC
  // -----------------------------
  async function loadHeaderFooter() {
    Loader.start();

    const prefix = getPrefixByPathDepth();

    const headerMount = document.getElementById("header");
    const footerMount = document.getElementById("footer");

    try {
      const [headerHtml, footerHtml] = await Promise.all([
        fetch(prefix + "header.html").then((r) => r.text()),
        fetch(prefix + "footer.html").then((r) => r.text()),
      ]);

      if (headerMount) headerMount.innerHTML = headerHtml;
      if (footerMount) footerMount.innerHTML = footerHtml;

      // init tek kad je ubačeno
      initScrollHeader();

      // pusti layout da “sedne” pre prikaza (1 frame)
      requestAnimationFrame(() => {
        document.body.classList.remove("js-hidden");
      });

      Loader.finish();
    } catch (err) {
      console.error("Greška pri učitavanju headera ili footera:", err);

      // čak i kad pukne, nemoj da ostane sve sakriveno
      document.body.classList.remove("js-hidden");
      Loader.fail();
    }
  }

  // Fallback: ako iz nekog razloga ostane hidden (npr. JS error posle), skini na load
  window.addEventListener("load", function () {
    if (document.body.classList.contains("js-hidden")) {
      document.body.classList.remove("js-hidden");
    }
  });

  // -----------------------------
  // Carousel (your existing)
  // -----------------------------
  function initCarouselIfPresent() {
    const track = document.getElementById("carousel-track");
    if (!track) return;

    const slides = Array.from(track.children);
    const prevBtn = document.querySelector(".carousel-btn.prev");
    const nextBtn = document.querySelector(".carousel-btn.next");

    const lines = Array.from(document.querySelectorAll(".carousel-lines .line"));
    const dots = Array.from(document.querySelectorAll(".carousel-dots .dot"));

    let index = 0;
    let autoTimer = null;
    const AUTO_MS = 6000;

    function slideWidth() {
      return track.clientWidth;
    }
    function clamp(i) {
      const max = slides.length - 1;
      if (i < 0) return max;
      if (i > max) return 0;
      return i;
    }

    function updateIndicators() {
      if (lines.length) {
        lines.forEach((el, i) => {
          el.classList.toggle("active", i === index);
          el.setAttribute("aria-selected", i === index ? "true" : "false");
          el.setAttribute("tabindex", i === index ? "0" : "-1");
        });
      }
      if (dots.length) {
        dots.forEach((el, i) => {
          el.classList.toggle("is-active", i === index);
          el.setAttribute("aria-selected", i === index ? "true" : "false");
          el.setAttribute("tabindex", i === index ? "0" : "-1");
        });
      }
    }

    function updateARIA() {
      slides.forEach((s, i) => {
        s.setAttribute("aria-hidden", i === index ? "false" : "true");
      });
    }

    function goTo(i, smooth = true) {
      index = clamp(i);
      track.scrollTo({
        left: index * slideWidth(),
        behavior: smooth ? "smooth" : "auto",
      });
      updateIndicators();
      updateARIA();
    }

    function scrollByDir(dir) {
      goTo(index + dir);
    }

    if (prevBtn) prevBtn.addEventListener("click", () => scrollByDir(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => scrollByDir(1));

    lines.forEach((line, i) => {
      line.addEventListener("click", () => goTo(i));
      line.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goTo(i);
        }
      });
    });

    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => goTo(i));
      dot.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goTo(i);
        }
      });
    });

    const carouselSection = document.querySelector(".hero-carousel");
    if (carouselSection) {
      carouselSection.setAttribute("tabindex", "-1");
      carouselSection.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          scrollByDir(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          scrollByDir(-1);
        }
        if (e.key === "Home") {
          e.preventDefault();
          goTo(0);
        }
        if (e.key === "End") {
          e.preventDefault();
          goTo(slides.length - 1);
        }
      });
    }

    let scrollDebounce;
    track.addEventListener("scroll", () => {
      clearTimeout(scrollDebounce);
      scrollDebounce = setTimeout(() => {
        const i = Math.round(track.scrollLeft / slideWidth());
        if (i !== index) {
          index = clamp(i);
          updateIndicators();
          updateARIA();
        }
      }, 80);
    });

    function startAuto() {
      stopAuto();
      autoTimer = setInterval(() => scrollByDir(1), AUTO_MS);
    }
    function stopAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
    }

    ["mouseenter", "focusin", "touchstart"].forEach((evt) => {
      track.addEventListener(evt, stopAuto, { passive: true });
    });
    ["mouseleave", "focusout", "touchend", "touchcancel"].forEach((evt) => {
      track.addEventListener(evt, startAuto, { passive: true });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAuto();
      else startAuto();
    });

    window.addEventListener("resize", () => goTo(index, false));

    goTo(0, false);
    startAuto();

    window.scrollCarousel = (dir) => scrollByDir(dir);
    window.goToSlide = (i) => goTo(i);
  }

  // -----------------------------
  // Boot
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    // body ostaje hidden dok ne ubacimo header/footer
    loadHeaderFooter();

    // carousel se inituje normalno (ako postoji na stranici)
    initCarouselIfPresent();
  });
})();
