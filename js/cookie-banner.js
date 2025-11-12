// cookie-banner.js

// 1) GA loader – zove se samo POSLE pristanka
function loadGA() {
  if (window.gtagLoaded) return;
    // dodatna zaštita: ako je gtag.js već učitan, ne učitavaj ponovo
  if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
  window.gtagLoaded = true;

  // dozvoli GA tek sada
  window['ga-disable-G-EBNDR2EZ07'] = false; // <-- moj GA ID

  // pripremi gtag i update-uj consent na granted
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'update', {
    ad_storage: 'granted',
    analytics_storage: 'granted'
  });

  const s = document.createElement('script');
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-EBNDR2EZ07'; // <-- moj GA ID
  s.async = true;
  s.onload = function () {
    gtag('js', new Date());
    gtag('config', 'G-EBNDR2EZ07', { anonymize_ip: true, transport_type: 'beacon' }); // <-- moj GA ID
  };
  document.head.appendChild(s);
}

// 2) Veži evente na baner
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
    loadGA();
  }
}

// 3) Bootstrap – podržava i dinamički i statički baner
document.addEventListener('DOMContentLoaded', function () {
  const placeholder = document.getElementById('cookie-banner-placeholder');

  if (placeholder) {
    // Dinamičko učitavanje HTML-a banera
    fetch('/pages/cookie-banner.html')
      .then(r => r.text())
      .then(html => { placeholder.innerHTML = html; wireCookieBanner(); })
      .catch(err => {
        console.error('Greška pri učitavanju cookie bannera:', err);
        // fallback: GA ostaje ugašen
      });
  } else {
    // Baner je već u DOM-u
    wireCookieBanner();
  }
});
