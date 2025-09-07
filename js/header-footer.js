// Funkcija za skrivanje logotipa pri scrollu (mobilni) i lepljenje navigacije
function initScrollHeader() {
  const header = document.querySelector("header");
  if (!header) return;

  const nav = header.querySelector(".header-nav");
  const paragraph = header.querySelector(".header-text p");

  if (!nav || !paragraph) return;

  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    if (window.innerWidth > 768) return; // samo na mobilnim

    let currentScroll = window.pageYOffset;

    if (currentScroll > lastScroll && currentScroll > 150) {
      header.classList.add("hide-logo");
    } else {
      header.classList.remove("hide-logo");
    }

    const paragraphRect = paragraph.getBoundingClientRect();
    const paragraphVisible = paragraphRect.bottom > 0;

    if (!paragraphVisible) {
      nav.classList.add("sticky");
    } else {
      nav.classList.remove("sticky");
    }

    lastScroll = currentScroll;
  });
}

// Učitavanje headera i footera i pozivanje initScrollHeader kad je header ubačen
document.addEventListener("DOMContentLoaded", () => {
  // Dinamički prefix ako imaš podfoldere
  const depth = window.location.pathname.split("/").length - 2;
  const prefix = "../".repeat(depth);

  Promise.all([
    fetch(prefix + "header.html").then(res => res.text()),
    fetch(prefix + "footer.html").then(res => res.text())
  ]).then(([headerHtml, footerHtml]) => {
    document.getElementById("header").innerHTML = headerHtml;
    document.getElementById("footer").innerHTML = footerHtml;

    // Pokreni efekat za header
    initScrollHeader();
  }).catch(err => {
    console.error("Greška pri učitavanju headera ili footera:", err);
  }).finally(() => {
    // Prikaz tela stranice
    document.body.style.display = "block";
  });
});
