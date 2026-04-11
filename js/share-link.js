/*
 * share-link.js
 *
 * ============================================================
 * BLOK 0) LEGENDA
 * ============================================================
 *
 * Svrha skripte:
 * - Omogućava korisniku da podeli trenutnu stranicu
 *   putem sistemskog share menija na telefonu.
 * - Ako share meni nije dostupan (desktop / stariji browser),
 *   koristi fallback: kopiranje linka u clipboard.
 *
 *
 * ============================================================
 * BLOK 1) ŠTA SKRIPTA RADI
 * ============================================================
 *
 * 1) Čita naslov stranice
 *
 *    - Primarno uzima tekst iz <h1>
 *    - Ako <h1> ne postoji → koristi document.title
 *
 *    primer:
 *
 *    <h1>HDMI switch sa 3 ulaza na 1 izlaz 4K – Gembird</h1>
 *
 *
 * 2) Čita trenutni URL stranice
 *
 *    koristi:
 *
 *    window.location.href
 *
 *    primer:
 *
 *    https://kupify.rs/pages/products/hdmi-oprema-i-kablovi/...
 *
 *
 * 3) Proverava da li browser podržava Web Share API
 *
 *    if (navigator.share)
 *
 *    - najčešće dostupno na mobilnim uređajima
 *    - otvara sistemski share meni
 *
 *
 * 4) Ako postoji Web Share API
 *
 *    poziva:
 *
 *    navigator.share({
 *      title: ...,
 *      url: ...
 *    })
 *
 *    rezultat:
 *
 *    - otvara native share meni telefona
 *    - korisnik bira aplikaciju:
 *        Viber, WhatsApp, Messenger, SMS, itd.
 *
 *
 * 5) Ako Web Share API NE postoji
 *
 *    koristi fallback:
 *
 *    navigator.clipboard.writeText(url)
 *
 *    rezultat:
 *
 *    - link se kopira u clipboard
 *    - korisnik može ručno da ga zalepi gde želi
 *
 *
 * 6) Ako clipboard nije dostupan
 *
 *    krajnji fallback:
 *
 *    - prikazuje URL korisniku (alert)
 *
 *
 * ============================================================
 * BLOK 2) KAKO SE KORISTI
 * ============================================================
 *
 * HTML dugme:
 *
 *    <button class="btn-share" onclick="shareLink()">Podeli</button>
 *
 * Klik na dugme direktno poziva funkciju shareLink().
 *
 * Skripta NE vezuje event listenere automatski.
 *
 */


function shareLink() {
  const h1 = document.querySelector("h1");
  const title = h1 ? h1.innerText.trim() : document.title;
  const url = window.location.href;

  if (navigator.share) {
    navigator.share({
      title: title,
      url: url
    }).catch(() => {
      // korisnik zatvorio share → ignoriši
    });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url)
      .then(() => {
        alert("Link kopiran ✔");
      })
      .catch(() => {
        alert("Kopiranje nije uspelo");
      });
  } else {
    alert(url);
  }
}
