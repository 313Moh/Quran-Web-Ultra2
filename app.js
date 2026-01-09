// تطبيق عرض صفحات المصحف مع تحسينا�� للسرعة والتوافق
const IMAGE_COUNT = 604;
let currentPage = 1;

const MODE = {
    PAGE: "page",
    MAIN: "main",
    SURAH: "surah",
    JUZ: "juz",
    PAGE_SEARCH: "page_search"
};

let mode = MODE.PAGE;
let focusables = [];
let focusIndex = -1;

const img = document.getElementById("quran-page-image");
const menuOverlay = document.getElementById("menu-overlay");
const menuBox = document.getElementById("menu-box");
const spinner = document.getElementById("spinner");
const imageError = document.getElementById("image-error");

const imageCache = new Map(); // page -> { status, src }

// last page from localStorage
const saved = localStorage.getItem("lastPage");
if (saved) currentPage = +saved;

// ---------- Helpers for loading images ----------

function getCandidatesFor(page) {
    // ترتيب المحاولات: webp (أفضل), jpeg, jpg, low-res jpeg
    return [
        `pages/webp/page${page}.webp`,
        `pages/page${page}.jpeg`,
        `pages/page${page}.jpg`,
        `pages/low/page${page}.jpeg`
    ];
}

function loadImageSrc(src, timeout = 8000) {
    return new Promise((resolve, reject) => {
        const im = new Image();
        // بعض بيئات التلفزيون تتطلب نفس الأصل أو crossorigin - لا نستخدم الآن
        let done = false;
        const t = setTimeout(() => {
            if (done) return;
            done = true;
            im.onload = im.onerror = null;
            reject(new Error('timeout'));
        }, timeout);

        im.onload = () => {
            if (done) return;
            done = true;
            clearTimeout(t);
            resolve(src);
        };
        im.onerror = () => {
            if (done) return;
            done = true;
            clearTimeout(t);
            reject(new Error('error'));
        };
        im.src = src;
    });
}

async function preloadImage(page, options = {}) {
    if (page < 1 || page > IMAGE_COUNT) throw new Error('out-of-range');

    if (imageCache.has(page)) {
        const entry = imageCache.get(page);
        if (entry.status === 'loaded' || entry.status === 'loading') return entry.promise || entry.src;
    }

    const candidates = getCandidatesFor(page);
    let resolveOuter, rejectOuter;
    const outerPromise = new Promise((res, rej) => { resolveOuter = res; rejectOuter = rej; });

    imageCache.set(page, { status: 'loading', promise: outerPromise });

    // Try sequentially: if low-res (last candidate) loads faster, we still try higher quality later
    (async () => {
        let lastError;
        for (let i = 0; i < candidates.length; i++) {
            const s = candidates[i];
            try {
                const src = await loadImageSrc(s, options.timeout || 6000);
                // success
                imageCache.set(page, { status: 'loaded', src });
                resolveOuter(src);
                // after we succeeded on a low-res, still try to load a better one in background
                // but only if a better candidate exists earlier in the list
                for (let j = 0; j < i; j++) {
                    const better = candidates[j];
                    // background attempt (no await)
                    loadImageSrc(better, 8000).then(bsrc => {
                        imageCache.set(page, { status: 'loaded', src: bsrc });
                    }).catch(()=>{});
                }
                return;
            } catch (err) {
                lastError = err;
                // try next candidate
            }
        }
        // no candidate worked
        imageCache.set(page, { status: 'error' });
        rejectOuter(lastError || new Error('no-src'));
    })();

    return outerPromise;
}

function showSpinner(show) {
    spinner.classList.toggle('hidden', !show);
    spinner.setAttribute('aria-hidden', String(!show));
}

function showImageError(show, text) {
    if (show) {
        imageError.textContent = text || 'عذراً: لم نتمكن من تحميل الصفحة.';
        imageError.classList.remove('hidden');
    } else {
        imageError.classList.add('hidden');
    }
}

// ---------- Show page with caching & preloading neighbors ----------

async function showPage(p) {
    if (p < 1 || p > IMAGE_COUNT) return;
    currentPage = p;
    localStorage.setItem("lastPage", p);

    showImageError(false);
    showSpinner(true);

    // If already loaded in cache, set immediately
    const cached = imageCache.get(p);
    if (cached && cached.status === 'loaded' && cached.src) {
        img.src = cached.src;
        img.alt = `صفحة ${p}`;
        showSpinner(false);
    } else {
        // attempt to preload (this will update cache when done)
        try {
            const src = await preloadImage(p, { timeout: 6000 });
            img.src = src;
            img.alt = `صفحة ${p}`;
            showSpinner(false);
        } catch (err) {
            // failed to load; show error and try direct fallback
            showSpinner(false);
            showImageError(true, 'فشل تحميل الصفحة. <br> الرجاء التأكد من وجود الصور على المسار الصحيح أو تقليل حجم الصور.');
            console.error('load page error', p, err);
            return;
        }
    }

    // Preload neighbors for smooth navigation
    [p - 2, p - 1, p + 1, p + 2].forEach(n => {
        if (n >= 1 && n <= IMAGE_COUNT) {
            // fire-and-forget preload
            preloadImage(n, { timeout: 7000 }).catch(()=>{});
        }
    });

    // Optionally: prefetch via <link rel="preload"> for the immediate next
    const next = p + 1;
    if (next <= IMAGE_COUNT) {
        const cand = getCandidatesFor(next)[0];
        // create rel=preload link if not exists
        if (!document.querySelector(`link[data-preload='page${next}']`)) {
            const l = document.createElement('link');
            l.rel = 'preload';
            l.as = 'image';
            l.href = cand;
            l.setAttribute('data-preload', `page${next}`);
            document.head.appendChild(l);
        }
    }

    // ensure viewport top
    window.scrollTo(0, 0);
}

// ---------- Focus & accessibility utilities ----------

function setFocusables(list) {
    focusables = Array.from(list);
    focusables.forEach(el => {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
    focusIndex = focusables.length ? 0 : -1;
    updateFocus();
}

function updateFocus() {
    focusables.forEach((el, i) => {
        el.classList.toggle("focused", i === focusIndex);
    });
    if (focusIndex >= 0 && focusIndex < focusables.length) {
        try {
            focusables[focusIndex].focus({ preventScroll: true });
        } catch (e) {
            try { focusables[focusIndex].focus(); } catch (e) {}
        }
        focusables[focusIndex].scrollIntoView({ block: "nearest" });
    }
}

function moveFocus(dir) {
    if (!focusables.length) return;
    focusIndex = Math.max(0, Math.min(focusIndex + dir, focusables.length - 1));
    updateFocus();
}

function enableMouseFocus(el) {
    el.addEventListener("mouseenter", () => {
        focusIndex = focusables.indexOf(el);
        updateFocus();
    });
}

// ---------- Menus ----------

function openMainMenu() {
    mode = MODE.MAIN;
    menuOverlay.classList.remove("hidden");
    menuOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');

    menuBox.innerHTML = `
        <div class="menu-item">السور</div>
        <div class="menu-item">الأجزاء</div>
        <div class="menu-item">الصفحات</div>
    `;

    const items = [...menuBox.querySelectorAll(".menu-item")];

    items[0].onclick = openSurahMenu;
    items[1].onclick = openJuzMenu;
    items[2].onclick = openPageSearch;

    items.forEach(enableMouseFocus);
    setFocusables(items);
}

function closeMenu() {
    menuOverlay.classList.add("hidden");
    menuOverlay.setAttribute('aria-hidden', 'true');
    mode = MODE.PAGE;
    document.body.classList.remove('no-scroll');
    focusables = [];
    focusIndex = -1;
}

/* ================= سور ================= */

function openSurahMenu() {
    mode = MODE.SURAH;

    menuBox.innerHTML = `
        <div class="menu-item">⬅ رجوع</div>
        <input class="search-box" placeholder="بحث باسم السورة" aria-label="بحث باسم السورة">
        <div class="scroll-container"></div>
    `;

    const back = menuBox.children[0];
    const search = menuBox.children[1];
    const list = menuBox.children[2];

    back.onclick = openMainMenu;

    function render(filter = "") {
        list.innerHTML = "";
        const q = filter.trim().normalize('NFC').toLowerCase();
        (typeof allSurahs !== 'undefined' ? allSurahs : []).filter(s => s.name.normalize('NFC').toLowerCase().includes(q))
            .forEach(s => {
                const d = document.createElement("div");
                d.className = "menu-item";
                d.textContent = s.name;
                d.onclick = () => {
                    closeMenu();
                    showPage(s.startPage);
                };
                list.appendChild(d);
                enableMouseFocus(d);
            });

        setFocusables([back, search, ...list.children]);
        focusIndex = 2;
        updateFocus();
    }

    search.oninput = () => render(search.value);
    enableMouseFocus(back);
    enableMouseFocus(search);
    render();
}

/* ================= أجزاء ================= */

function openJuzMenu() {
    mode = MODE.JUZ;

    menuBox.innerHTML = `
        <div class="menu-item">⬅ رجوع</div>
        <input class="search-box" placeholder="بحث برقم الجزء" aria-label="بحث برقم الجزء">
        <div class="scroll-container"></div>
    `;

    const back = menuBox.children[0];
    const search = menuBox.children[1];
    const list = menuBox.children[2];

    back.onclick = openMainMenu;

    function render(filter = "") {
        list.innerHTML = "";
        const q = filter.trim().normalize('NFC').toLowerCase();
        (typeof allJuz !== 'undefined' ? allJuz : []).filter(j => j.name.normalize('NFC').toLowerCase().includes(q))
            .forEach(j => {
                const d = document.createElement("div");
                d.className = "menu-item";
                d.textContent = j.name;
                d.onclick = () => {
                    closeMenu();
                    showPage(j.startPage);
                };
                list.appendChild(d);
                enableMouseFocus(d);
            });

        setFocusables([back, search, ...list.children]);
        focusIndex = 2;
        updateFocus();
    }

    search.oninput = () => render(search.value);
    enableMouseFocus(back);
    enableMouseFocus(search);
    render();
}

/* ================= بحث الصفحات ================= */

function openPageSearch() {
    mode = MODE.PAGE_SEARCH;

    menuBox.innerHTML = `
        <div class="menu-item">⬅ رجوع</div>
        <input class="search-box" placeholder="رقم الصفحة" aria-label="رقم الصفحة">
        <div class="menu-item">اذهب</div>
    `;

    const [back, input, go] = menuBox.children;

    back.onclick = openMainMenu;
    go.onclick = () => {
        const v = +input.value;
        if (Number.isInteger(v) && v >= 1 && v <= IMAGE_COUNT) {
            closeMenu();
            showPage(v);
        }
    };

    input.setAttribute('type', 'number');
    input.setAttribute('inputmode', 'numeric');
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') go.click();
    });

    [back, input, go].forEach(enableMouseFocus);
    setFocusables([back, input, go]);
}

/* ================= ريموت (لوحة مفاتيح) ================= */

document.addEventListener("keydown", e => {

    if (mode === MODE.PAGE) {
        if (e.key === "ArrowUp") { window.scrollBy(0, -80); e.preventDefault(); }
        if (e.key === "ArrowDown") { window.scrollBy(0, 80); e.preventDefault(); }
        if (e.key === "ArrowRight") { showPage(currentPage - 1); e.preventDefault(); } // RTL: يمين = السابق
        if (e.key === "ArrowLeft") { showPage(currentPage + 1); e.preventDefault(); }  // RTL: يسار = التالي
        if (e.key === "Enter") openMainMenu();
        if (e.key === "PageUp") showPage(Math.max(1, currentPage - 10));
        if (e.key === "PageDown") showPage(Math.min(IMAGE_COUNT, currentPage + 10));
        return;
    }

    if (e.key === "ArrowDown") moveFocus(1);
    if (e.key === "ArrowUp") moveFocus(-1);

    if (e.key === "Enter") {
        focusables[focusIndex]?.click();
    }

    if (e.key === "Backspace" || e.key === "Escape") {
        if (mode === MODE.MAIN) closeMenu();
        else openMainMenu();
    }
});

/* ========== بداية ========== */

showPage(currentPage).catch(()=>{});
