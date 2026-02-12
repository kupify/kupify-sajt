// cookie-banner.js

// 0) helper: pozovi tvoje init funkcije za evente (ako postoje)
function initAnalyticsEvents() {
  if (typeof window.initBlogAnalytics === 'function') {
    window.initBlogAnalytics();
  }
  if (typeof window.initProductAnalytics === 'function') {
    window.initProductAnalytics();
  }
}

// 1) GA loader – zove se samo POSLE pristanka
function loadGA() {
  if (window.gtagLoaded) {
    // GA je već tu -> samo obavezno upali evente
    initAnalyticsEvents();
    return;
  }

  // dodatna zaštita: ako je gtag.js već učitan, ne učitavaj ponovo
  if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    window.gtagLoaded = true;
    initAnalyticsEvents();
    return;
  }

  window.gtagLoaded = true;

  // pripremi gtag i update-uj consent na granted
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'update', {
    ad_storage: 'denied',          // ads ti ne trebaju -> ostavi denied
    analytics_storage: 'granted'
  });

  const s = document.createElement('script');
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-EBNDR2EZ07';
  s.async = true;
  s.onload = function () {
    gtag('js', new Date());
    gtag('config', 'G-EBNDR2EZ07', { anonymize_ip: true, transport_type: 'beacon' });

    // TEK SAD (kad postoji gtag + config) pali evente
    initAnalyticsEvents();
  };
  document.head.appendChild(s);
}

// 2) Veži baner
function wireCookieBanner() {
  const cookieBanner = document.getElementById('cookie-banner');
  const acceptBtn = document.getElementById('accept-cookies');

  if (!cookieBanner || !acceptBtn) return;

  if (!localStorage.getItem('cookiesAccepted')) {
    cookieBanner.style.display = 'flex';

    acceptBtn.addEventListener('click', function () {
      localStorage.setItem('cookiesAccepted', 'true');
      cookieBanner.style.display = 'none';
      loadGA();
    }, { once: true });

  } else {
    // već prihvaćeno ranije
    loadGA();
  }
}

// 3) Bootstrap – podržava i dinamički i statički baner
document.addEventListener('DOMContentLoaded', function () {
  if (localStorage.getItem('cookiesAccepted')) {
    loadGA();
    return;
  }

  const placeholder = document.getElementById('cookie-banner-placeholder');

  if (!placeholder) {
    wireCookieBanner();
    return;
  }

  setTimeout(() => {
    fetch('/cookie-banner.html', { cache: 'no-store' })
      .then(r => r.text())
      .then(html => {
        placeholder.innerHTML = html;
        wireCookieBanner();
      })
      .catch(err => {
        console.error('Greška pri učitavanju cookie bannera:', err);
      });
  }, 1000);
});
