// Anti-FOUC: prikaži telo čim je DOM spreman
document.addEventListener("DOMContentLoaded", function () {
  document.body.classList.remove("js-hidden");
});

// Fallback: ako iz nekog razloga DOMContentLoaded ne radi, 
// skini klasu kad se baš sve učita (slike, fontovi, CSS...)
window.addEventListener("load", function () {
  if (document.body.classList.contains("js-hidden")) {
    document.body.classList.remove("js-hidden");
  }
});

// Funkcija za skrivanje logotipa pri scrollu (mobilni) i lepljenje navigacije + searcha
function initScrollHeader() {
  const header = document.querySelector("header");
  if (!header) return;

  const nav = header.querySelector(".header-nav");
  const search = header.querySelector(".site-search");
  const paragraph = header.querySelector(".header-text p");
  if (!nav || !paragraph) return;

  let lastScroll = 0;

  const setVars = () => {
    // visina sticky navigacije
    const navH = nav.getBoundingClientRect().height || 48;
    document.documentElement.style.setProperty("--navH", navH + "px");

    // visina searcha (kad je fiksiran) – koristi trenutnu visinu
    if (search) {
      const sh = search.getBoundingClientRect().height || 56;
      document.documentElement.style.setProperty("--searchH", sh + "px");
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      if (window.innerWidth > 768) return; // samo na mobilnim

      const currentScroll = window.pageYOffset;

      // Sakrij logo pri brzom skrolu nadole
      if (currentScroll > lastScroll && currentScroll > 150) {
        header.classList.add("hide-logo");
      } else {
        header.classList.remove("hide-logo");
      }

      // Kada uvodni paragraf nestane sa ekrana → lepi nav + search
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

  // ažuriraj na resize (promena orijentacije, address bar, itd.)
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768 && nav.classList.contains("sticky")) {
      setVars();
    }
  }, { passive: true });
}

initScrollHeader();



// Učitavanje headera i footera i pozivanje initScrollHeader kad je header ubačen
document.addEventListener("DOMContentLoaded", () => {
  // Dinamički prefix ako imaš podfoldere
  const depth = Math.max(0, window.location.pathname.split("/").length - 2);
  const prefix = "../".repeat(depth);

  Promise.all([
    fetch(prefix + "header.html").then((res) => res.text()),
    fetch(prefix + "footer.html").then((res) => res.text()),
  ])
    .then(([headerHtml, footerHtml]) => {
      const headerMount = document.getElementById("header");
      const footerMount = document.getElementById("footer");
      if (headerMount) headerMount.innerHTML = headerHtml;
      if (footerMount) footerMount.innerHTML = footerHtml;

      initScrollHeader();
    })
    .catch((err) => {
      console.error("Greška pri učitavanju headera ili footera:", err);
    });
});

// === KUPIFY Carousel (minimal, accessible) — supports lines OR dots ===
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const track = document.getElementById('carousel-track');
    if (!track) return; // nema karusela na ovoj stranici

    const slides = Array.from(track.children);
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');

    // Indicators: prefer lines, fallback to dots (ako postoje)
    const lines = Array.from(document.querySelectorAll('.carousel-lines .line'));
    const dots  = Array.from(document.querySelectorAll('.carousel-dots .dot'));

    let index = 0;
    let autoTimer = null;
    const AUTO_MS = 6000; // auto-advance interval

    // --- helpers ---
    function slideWidth() {
      return track.clientWidth;
    }
    function clamp(i) {
      const max = slides.length - 1;
      if (i < 0) return max;
      if (i > max) return 0;
      return i;
    }

    function goTo(i, smooth = true) {
      index = clamp(i);
      track.scrollTo({
        left: index * slideWidth(),
        behavior: smooth ? 'smooth' : 'auto',
      });
      updateIndicators();
      updateARIA();
    }

    function scrollByDir(dir) {
      goTo(index + dir);
    }

    function updateIndicators() {
      if (lines.length) {
        lines.forEach((el, i) => {
          el.classList.toggle('active', i === index);
          el.setAttribute('aria-selected', i === index ? 'true' : 'false');
          el.setAttribute('tabindex', i === index ? '0' : '-1');
        });
      }
      if (dots.length) {
        dots.forEach((el, i) => {
          el.classList.toggle('is-active', i === index);
          el.setAttribute('aria-selected', i === index ? 'true' : 'false');
          el.setAttribute('tabindex', i === index ? '0' : '-1');
        });
      }
    }

    function updateARIA() {
      slides.forEach((s, i) => {
        s.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      });
    }

    // --- events ---
    if (prevBtn) prevBtn.addEventListener('click', () => scrollByDir(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => scrollByDir(1));

    // Lines click/keyboard
    lines.forEach((line, i) => {
      line.addEventListener('click', () => goTo(i));
      line.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); }
      });
    });

    // Dots click/keyboard (ako postoje)
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => goTo(i));
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); }
      });
    });

    // Keyboard navođenje na celoj sekciji (← → Home End)
    const carouselSection = document.querySelector('.hero-carousel');
    if (carouselSection) {
      carouselSection.setAttribute('tabindex', '-1');
      carouselSection.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); scrollByDir(1); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollByDir(-1); }
        if (e.key === 'Home')       { e.preventDefault(); goTo(0); }
        if (e.key === 'End')        { e.preventDefault(); goTo(slides.length - 1); }
      });
    }

    // Sync index pri ručnom skrolu (touch/drag)
    let scrollDebounce;
    track.addEventListener('scroll', () => {
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

    // auto-advance (pauza na hover/focus/touch, nastavi na leave/blur/touchend)
    function startAuto() {
      stopAuto();
      autoTimer = setInterval(() => scrollByDir(1), AUTO_MS);
    }
    function stopAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
    }
    ['mouseenter', 'focusin', 'touchstart'].forEach(evt => {
      track.addEventListener(evt, stopAuto, { passive: true });
    });
    ['mouseleave', 'focusout', 'touchend', 'touchcancel'].forEach(evt => {
      track.addEventListener(evt, startAuto, { passive: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAuto(); else startAuto();
    });

    // Recalc na resize (zadrži poravnanje)
    window.addEventListener('resize', () => goTo(index, false));

    // Init
    goTo(0, false);
    startAuto();

    // === Expose global helpers for inline HTML onclick ===
    window.scrollCarousel = (dir) => scrollByDir(dir);
    window.goToSlide = (i) => goTo(i);
  });
})();


