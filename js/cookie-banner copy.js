function loadGA() {
  if (window.gtagLoaded) return; // da ne učitava više puta
  window.gtagLoaded = true;

  const script = document.createElement('script');
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-EBNDR2EZ07"; // stavi svoj GA ID
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag; // da bude globalno dostupan

  gtag('js', new Date());
  gtag('config', 'G-EBNDR2EZ07', { 'anonymize_ip': true });
}

document.addEventListener("DOMContentLoaded", function () {
  fetch('/pages/cookie-banner.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('cookie-banner-placeholder').innerHTML = html;

      // Sad možeš dodati event listener za prihvatanje kolačića
      const acceptBtn = document.getElementById("accept-cookies");
      const cookieBanner = document.getElementById("cookie-banner");

      if (!localStorage.getItem("cookiesAccepted")) {
        cookieBanner.style.display = "flex";

        acceptBtn.addEventListener("click", function () {
          localStorage.setItem("cookiesAccepted", "true");
          cookieBanner.style.display = "none";
          loadGA(); // poziva GA učitavanje nakon prihvatanja
        });
      } else {
        // Ako je već prihvaćeno, odmah učitaj GA
        loadGA();
      }
    })
    .catch(err => {
      console.error('Greška prilikom učitavanja cookie bannera:', err);
    });
});
