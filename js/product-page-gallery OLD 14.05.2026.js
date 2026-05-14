let GALLERY = [];
        let currentIndex = 0;

        function rebuildGallery() {
            const thumbs = Array.from(document.querySelectorAll('.thumbnails img[role="button"]'));
            GALLERY = thumbs
                .filter(img => img.style.display !== 'none' && img.dataset.missing !== '1')
                .map(img => img.getAttribute('src').replace('-thumb.webp', '.webp'))
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

        function changeImage(imageSrc) {
            const el = document.getElementById('mainImage');
            if (!el) return;

            el.src = imageSrc;

            const idx = GALLERY.indexOf(imageSrc);
            if (idx !== -1) currentIndex = idx;
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
                });
            }

            function showByOffset(offset) {
                rebuildGallery();
                if (!GALLERY.length) return;
                currentIndex = (currentIndex + offset + GALLERY.length) % GALLERY.length;
                changeImage(GALLERY[currentIndex]);
            }

            const prev = document.querySelector('.gallery-arrow.prev');
            const next = document.querySelector('.gallery-arrow.next');
            if (prev) prev.addEventListener('click', () => showByOffset(-1));
            if (next) next.addEventListener('click', () => showByOffset(1));

            // tastatura ← →
            const gallery = document.querySelector('.product-gallery');
            if (gallery) {
                gallery.addEventListener('keydown', e => {
                    if (e.key === 'ArrowLeft') { e.preventDefault(); showByOffset(-1); }
                    if (e.key === 'ArrowRight') { e.preventDefault(); showByOffset(1); }
                });
            }

            // inicijalno
            rebuildGallery();
        });