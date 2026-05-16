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
- Swipe na mobilnom radi kao pravi carousel:
  trenutna slika izlazi, a sledeća/prethodna ulazi zalepljena iza nje.
- Preloaduje sledeću sliku na početnom učitavanju da prvi swipe ulevo ne štucne.
- Posle svake promene slike preloaduje prethodnu i sledeću sliku.
- Sprečava ponovni preload iste slike pomoću interne liste već preloadovanih slika.
- Ignoriše mikro-pomeraje prsta da se carousel ne aktivira slučajno.
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
- JS wrapper za swipe i tastaturu treba da ima klasu .product-gallery.
- Spoljašnji layout wrapper može da koristi .product-page-gallery za CSS stilove.
- Za vizuelno aktivno stanje koristi se CSS klasa .is-active.
- Za TAB navigaciju koristi se :focus-visible u CSS-u.
- Za swipe carousel CSS mora da podrži .swipe-preview-image i .is-dragging.

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

    // Posle promene slike pripremi prethodnu i sledeću sliku
    // za naredni swipe.
    preloadNearbyImages();
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

const PRELOADED_IMAGES = new Set();

function preloadImage(src) {
    if (!src || PRELOADED_IMAGES.has(src)) return;

    PRELOADED_IMAGES.add(src);

    const img = new Image();
    img.decoding = 'async';
    img.src = src;
}

function preloadNextImage() {
    if (!GALLERY.length) return;

    const nextIndex = (currentIndex + 1) % GALLERY.length;

    // Na početnom učitavanju pripremamo samo sledeću sliku,
    // jer je prvi prirodni swipe najčešće ulevo.
    preloadImage(GALLERY[nextIndex]);
}

function preloadNearbyImages() {
    if (!GALLERY.length) return;

    const prevIndex = (currentIndex - 1 + GALLERY.length) % GALLERY.length;
    const nextIndex = (currentIndex + 1) % GALLERY.length;

    // Posle svake promene slike pripremamo oba smera.
    preloadImage(GALLERY[prevIndex]);
    preloadImage(GALLERY[nextIndex]);
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
    let mainImageErrorAttempts = 0;

    if (main) {
        main.addEventListener('error', () => {
            if (!GALLERY.length) return;

            mainImageErrorAttempts += 1;

            // Sprečava beskonačno kruženje ako sve velike slike fale
            if (mainImageErrorAttempts > GALLERY.length) {
                // Ako nijedna velika slika ne može da se učita, prekidamo fallback.
                return;
            }

            currentIndex = (currentIndex + 1) % GALLERY.length;
            main.src = GALLERY[currentIndex];

            // Ako glavna slika pukne i pređemo na sledeću,
            // označi odgovarajući thumb bez pomeranja fokusa.
            syncActiveThumb(false);
        });

        // Kada se glavna slika uspešno učita,
        // resetujemo brojač grešaka.
        main.addEventListener('load', () => {
            mainImageErrorAttempts = 0;
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

        // Trenutni horizontalni pomeraj tokom swipe-a
        let touchDiffX = 0;

        // Da znamo da li korisnik stvarno vuče horizontalno
        let isDraggingImage = false;

        // Privremena slika koja ulazi sa strane tokom swipe-a
        let swipePreviewImage = null;

        // Smer swipe-a: 1 = sledeća slika, -1 = prethodna slika
        let swipeDirection = 0;

        function removeSwipePreview() {
            if (swipePreviewImage) {
                swipePreviewImage.remove();
                swipePreviewImage = null;
            }
        }

        function createSwipePreview(direction) {
            const frame = document.querySelector('.main-image-frame');
            const main = document.getElementById('mainImage');

            if (!frame || !main || !GALLERY.length) return null;

            const previewIndex = (currentIndex + direction + GALLERY.length) % GALLERY.length;
            const previewSrc = GALLERY[previewIndex];
            const frameWidth = frame.getBoundingClientRect().width;

            removeSwipePreview();

            const img = document.createElement('img');
            img.src = previewSrc;
            img.decoding = 'async';
            img.loading = 'eager';
            img.alt = main.alt || '';
            img.className = 'swipe-preview-image is-dragging';

            // Preview sliku odmah postavljamo van kadra:
            // direction 1 = sledeća dolazi s desne strane
            // direction -1 = prethodna dolazi s leve strane
            img.style.transform = direction === 1
                ? `translateX(${frameWidth}px)`
                : `translateX(${-frameWidth}px)`;

            frame.appendChild(img);
            swipePreviewImage = img;

            return img;
        }

        // Pamti gde je korisnik spustio prst
        gallery.addEventListener('touchstart', e => {
            if (!e.touches.length) return;

            rebuildGallery();
            if (GALLERY.length <= 1) return;

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchDiffX = 0;
            isDraggingImage = false;
            swipeDirection = 0;

            removeSwipePreview();

            const main = document.getElementById('mainImage');
            if (main) {
                main.classList.add('is-dragging');
                main.style.transform = 'translateX(0)';
            }
        }, { passive: true });

        // Dok korisnik vuče prst, trenutna slika izlazi,
        // a sledeća/prethodna ulazi zalepljena iza nje.
        gallery.addEventListener('touchmove', e => {
            if (!e.touches.length || GALLERY.length <= 1) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            touchDiffX = currentX - touchStartX;
            const diffY = currentY - touchStartY;

            const main = document.getElementById('mainImage');
            const frame = document.querySelector('.main-image-frame');

            if (!main || !frame) return;

            // Ako je pokret više vertikalan nego horizontalan,
            // puštamo normalan scroll stranice.
            if (Math.abs(diffY) > Math.abs(touchDiffX)) {
                return;
            }

            // Ignorišemo mikro-pomeraje da se preview slika ne pravi prerano.
            if (Math.abs(touchDiffX) < 6) {
                return;
            }

            isDraggingImage = true;

            // Kada znamo smer, pravimo preview sliku:
            // diffX < 0 znači korisnik vuče ulevo, treba da uđe sledeća slika.
            // diffX > 0 znači korisnik vuče udesno, treba da uđe prethodna slika.
            const direction = touchDiffX < 0 ? 1 : -1;

            if (direction !== swipeDirection) {
                swipeDirection = direction;
                createSwipePreview(direction);
            }

            if (!swipePreviewImage) return;

            // Sprečava horizontalni browser gesture dok radimo galeriju.
            e.preventDefault();

            const frameWidth = frame.getBoundingClientRect().width;

            // Ograničenje da korisnik ne odvuče sliku besmisleno daleko
            const limitedDiffX = Math.max(-frameWidth, Math.min(frameWidth, touchDiffX));

            // Trenutna slika prati prst
            main.style.transform = `translateX(${limitedDiffX}px)`;

            // Preview slika stoji zalepljena iza trenutne:
            // za sledeću dolazi s desne strane,
            // za prethodnu dolazi s leve strane.
            if (swipeDirection === 1) {
                swipePreviewImage.style.transform = `translateX(${frameWidth + limitedDiffX}px)`;
            } else {
                swipePreviewImage.style.transform = `translateX(${-frameWidth + limitedDiffX}px)`;
            }
        }, { passive: false });

        // Kada korisnik pusti prst,
        // ili završavamo prelaz na sledeću/prethodnu sliku,
        // ili vraćamo sve nazad.
        gallery.addEventListener('touchend', e => {
            if (!e.changedTouches.length || GALLERY.length <= 1) return;

            const main = document.getElementById('mainImage');
            const frame = document.querySelector('.main-image-frame');

            if (!main || !frame) return;

            main.classList.remove('is-dragging');

            if (swipePreviewImage) {
                swipePreviewImage.classList.remove('is-dragging');
            }

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            const frameWidth = frame.getBoundingClientRect().width;
            const minSwipeDistance = 50;

            // Nije dovoljno jak horizontalni swipe: vrati obe slike na početak
            if (
                !isDraggingImage ||
                !swipePreviewImage ||
                Math.abs(diffX) < minSwipeDistance ||
                Math.abs(diffX) < Math.abs(diffY)
            ) {
                main.style.transform = 'translateX(0)';

                if (swipePreviewImage) {
                    if (swipeDirection === 1) {
                        swipePreviewImage.style.transform = `translateX(${frameWidth}px)`;
                    } else {
                        swipePreviewImage.style.transform = `translateX(${-frameWidth}px)`;
                    }
                }

                window.setTimeout(() => {
                    removeSwipePreview();
                }, 180);

                return;
            }

            // Dovoljno jak swipe: trenutna slika izlazi, preview ulazi na njeno mesto
            if (swipeDirection === 1) {
                // Sledeća slika
                main.style.transform = `translateX(${-frameWidth}px)`;
                swipePreviewImage.style.transform = 'translateX(0)';
            } else {
                // Prethodna slika
                main.style.transform = `translateX(${frameWidth}px)`;
                swipePreviewImage.style.transform = 'translateX(0)';
            }

            const finalDirection = swipeDirection;
            const finalIndex = (currentIndex + finalDirection + GALLERY.length) % GALLERY.length;
            const finalSrc = GALLERY[finalIndex];

            window.setTimeout(() => {
                // Dok menjamo pravu main sliku, gasimo transition da ne napravi trzaj
                main.classList.add('is-dragging');

                // Prvo upišemo novi index i novu sliku ispod preview slike
                currentIndex = finalIndex;
                changeImage(finalSrc, true);

                // Resetujemo pravu glavnu sliku na centralnu poziciju bez animacije
                main.style.transform = 'translateX(0)';

                // Sačekamo jedan frame da browser prihvati novu sliku i transform,
                // pa tek onda uklanjamo preview sliku koja je bila preko nje.
                requestAnimationFrame(() => {
                    removeSwipePreview();

                    requestAnimationFrame(() => {
                        main.classList.remove('is-dragging');

                        swipeDirection = 0;
                        isDraggingImage = false;
                        touchDiffX = 0;
                    });
                });
            }, 180);
        }, { passive: true });

        // Ako browser prekine dodir, sve vraćamo u normalno stanje
        gallery.addEventListener('touchcancel', () => {
            const main = document.getElementById('mainImage');

            if (main) {
                main.classList.remove('is-dragging');
                main.style.transform = 'translateX(0)';
            }

            removeSwipePreview();

            swipeDirection = 0;
            isDraggingImage = false;
            touchDiffX = 0;
        }, { passive: true });

    }

    // inicijalno
    rebuildGallery();

    // Označi thumb koji odgovara početnoj glavnoj slici.
    // false znači: ne pomeraj fokus pri učitavanju stranice.
    syncActiveThumb(false);

    // Pripremi samo sledeću sliku za prvi prirodni swipe ulevo.
    // Ovo smanjuje prvi swipe glitch, bez preloadovanja cele galerije.
    preloadNextImage();
});