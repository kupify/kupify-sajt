/*
================================================================================
PRODUCT PAGE GALLERY
================================================================================

Šta radi ovaj fajl:
- Pravi listu dostupnih slika proizvoda na osnovu thumbnail slika.
- Koristi data-full kao glavnu vezu između thumbnail slike i velike slike.
- Ako data-full ne postoji, koristi staru fallback logiku:
  slika-thumb.webp → slika.webp.
- Menja glavnu sliku klikom na thumb, prelaskom mišem preko thumba,
  strelicama levo/desno i swipe pokretom na mobilnom.
- Sakriva strelice ako proizvod ima samo jednu dostupnu sliku.
- Ako thumbnail slika ne postoji, sakriva je i izbacuje iz galerije.
- Ako glavna slika ne postoji, pokušava da pređe na sledeću dostupnu sliku.
- Obeležava trenutno aktivni thumb klasom .is-active.
- Dodaje aria-current="true" na aktivni thumb radi pristupačnosti.
- Fokus pomera na odgovarajući thumb samo kada korisnik klikne,
  koristi strelice, tastaturu ili swipe.
- Ne pomera fokus kod mouseover promene slike.

HTML očekivanje za thumb:
<img
    src="slika-thumb.webp"
    data-full="slika.webp"
    onmouseover="changeImage('slika.webp')"
    onclick="changeImage('slika.webp', true)"
    role="button"
    tabindex="0">

Napomena:
- Wrapper galerije treba da ima klasu .product-page-gallery ili .product-gallery.
- Za vizuelno aktivno stanje koristi se CSS klasa .is-active.
- Za TAB navigaciju koristi se :focus-visible u CSS-u.

================================================================================
*/
let GALLERY = [];
let currentIndex = 0;

function rebuildGallery() {
    const thumbs = Array.from(document.querySelectorAll('.thumbnails img[role="button"]'));
    GALLERY = thumbs
        // Uzimamo samo thumb slike koje nisu sakrivene i nisu označene kao nepostojeće
        .filter(img => img.style.display !== 'none' && img.dataset.missing !== '1')

        // Najpre koristimo data-full, jer je to eksplicitna veza:
        // ovaj thumb pripada ovoj velikoj slici.
        // Ako data-full ne postoji, ostaje fallback na staru logiku.
        .map(img => {
            if (img.dataset.full) {
                return img.dataset.full;
            }

            const thumbSrc = img.getAttribute('src');
            if (!thumbSrc) return '';

            return thumbSrc.replace('-thumb.webp', '.webp');
        })

        // Izbacujemo prazne vrednosti
        .filter(Boolean);

    // sakrij strelice ako nema smisla
    const prev = document.querySelector('.gallery-arrow.prev');
    const next = document.querySelector('.gallery-arrow.next');
    const showArrows = GALLERY.length > 1;
    if (prev) prev.style.display = showArrows ? '' : 'none';
    if (next) next.style.display = showArrows ? '' : 'none';

    // uskladi index sa trenutnim main src
    const main = document.getElementById('mainImage');
    if (main && GALLERY.length) {
        const idx = GALLERY.indexOf(main.getAttribute('src'));
        if (idx !== -1) currentIndex = idx;
    }
}

function changeImage(imageSrc, shouldFocusThumb = false) {
    const el = document.getElementById('mainImage');
    if (!el) return;

    el.src = imageSrc;

    const idx = GALLERY.indexOf(imageSrc);
    if (idx !== -1) currentIndex = idx;

    // Posle svake promene glavne slike uskladimo aktivni thumb
    syncActiveThumb(shouldFocusThumb);
}

function syncActiveThumb(shouldFocus = false) {
    const thumbs = Array.from(document.querySelectorAll('.thumbnails img[role="button"]'));

    thumbs.forEach(img => {
        // data-full je sada glavni izvor istine:
        // govori kojoj velikoj slici ovaj thumb pripada.
        const fullSrc =
            img.dataset.full ||
            (img.getAttribute('src') || '').replace('-thumb.webp', '.webp');

        const isActive = fullSrc === GALLERY[currentIndex];

        // Vizuelno aktivno stanje
        img.classList.toggle('is-active', isActive);

        // Accessibility: označava trenutno aktivan thumb
        img.setAttribute('aria-current', isActive ? 'true' : 'false');

        // Fokusiramo samo kada je promena nastala klikom, strelicom, tastaturom ili swipe-om.
        // Ne fokusiramo kod mouseover-a.
        if (isActive && shouldFocus) {
            img.focus({ preventScroll: true });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // a11y: thumb keyboard
    document.querySelectorAll('.thumbnails img[role="button"]').forEach(el => {
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
        });
    });

    // kad se dogodi error na thumbu, rebuild lista
    document.querySelectorAll('.thumbnails img[role="button"]').forEach(img => {
        img.addEventListener('error', () => { img.dataset.missing = '1'; img.style.display = 'none'; rebuildGallery(); });
        img.addEventListener('load', () => rebuildGallery());
    });

    // fallback ako main slika ne postoji (preskoči na sledeću postojeću)
    const main = document.getElementById('mainImage');
    if (main) {
        main.addEventListener('error', () => {
            if (!GALLERY.length) return;

            currentIndex = (currentIndex + 1) % GALLERY.length;
            main.src = GALLERY[currentIndex];

            // Ako glavna slika pukne i pređemo na sledeću,
            // označi odgovarajući thumb bez pomeranja fokusa.
            syncActiveThumb(false);
        });
    }

    function showByOffset(offset) {
        rebuildGallery();
        if (!GALLERY.length) return;

        currentIndex = (currentIndex + offset + GALLERY.length) % GALLERY.length;

        // true znači da se fokus prebaci na odgovarajući thumb
        // kada korisnik menja sliku strelicom, tastaturom ili swipe-om.
        changeImage(GALLERY[currentIndex], true);
    }

    const prev = document.querySelector('.gallery-arrow.prev');
    const next = document.querySelector('.gallery-arrow.next');
    if (prev) prev.addEventListener('click', () => showByOffset(-1));
    if (next) next.addEventListener('click', () => showByOffset(1));

    // tastatura ← → i mobilni swipe
    const gallery = document.querySelector('.product-gallery');

    if (gallery) {
        // Promena slike preko tastature kada je galerija fokusirana
        gallery.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                showByOffset(-1); // prethodna slika
            }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                showByOffset(1); // sledeća slika
            }
        });

        // Početna pozicija dodira
        let touchStartX = 0;
        let touchStartY = 0;

        // Pamti gde je korisnik spustio prst
        gallery.addEventListener('touchstart', e => {
            if (!e.touches.length) return;

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        // Kada korisnik pusti prst, proverava se da li je bio swipe levo/desno
        gallery.addEventListener('touchend', e => {
            if (!e.changedTouches.length) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            // Minimum da pokret stvarno bude swipe, a ne slučajan dodir
            const minSwipeDistance = 50;

            // Ako je pokret premali ili je više vertikalan nego horizontalan,
            // ne diramo galeriju i puštamo normalan scroll stranice
            if (Math.abs(diffX) < minSwipeDistance || Math.abs(diffX) < Math.abs(diffY)) {
                return;
            }

            // Ako postoji samo jedna slika, nema potrebe da menjamo sliku
            rebuildGallery();
            if (GALLERY.length <= 1) return;

            if (diffX < 0) {
                // Swipe levo = sledeća slika
                showByOffset(1);
            } else {
                // Swipe desno = prethodna slika
                showByOffset(-1);
            }
        }, { passive: true });
    }

    // inicijalno
    rebuildGallery();

    // Označi thumb koji odgovara početnoj glavnoj slici.
    // false znači: ne pomeraj fokus pri učitavanju stranice.
    syncActiveThumb(false);
});