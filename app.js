// app.js (محدث) — يتضمن إصلاحات لمشاكل البحث، وإهمال backspace داخل الحقول، ومنع تنفيذ مفتاح التنقل مباشرة بعد الإغلاق

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

const container = document.getElementById("quran-page-container");
const img = document.getElementById("quran-page-image");
const menuOverlay = document.getElementById("menu-overlay");
const menuBox = document.getElementById("menu-box");
const spinner = document.getElementById("spinner");
const imageError = document.getElementById("image-error");

const imageCache = new Map(); // page -> { status, src }
const startTime = Date.now();

// last page from localStorage
const saved = localStorage.getItem("lastPage");
if (saved) currentPage = +saved;

// initial state
menuOverlay.classList.add('hidden');
menuOverlay.setAttribute('aria-hidden', 'true');
showSpinner(false);
showImageError(false);

// Temporary suppression for navigation keys right after actions (to avoid double-handling from remotes)
let ignoreNavUntil = 0;

// ---------- Helpers for loading images ----------
function getCandidatesFor(page) {
    return [
        `pages/low/page${page}.jpeg`,
        `pages/webp/page${page}.webp`,
        `pages/page${page}.jpeg`,
        `pages/page${page}.jpg`
    ];
}

function loadImageSrc(src, timeout = 8000) {
    return new Promise((resolve, reject) => {
        const im = new Image();
        im.decoding = 'async';
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
        if (entry.status === 'loaded') return entry.src;
        if (entry.status === 'loading') return entry.promise;
    }

    const candidates = getCandidatesFor(page);
    let resolveOuter, rejectOuter;
    const outerPromise = new Promise((res, rej) => { resolveOuter = res; rejectOuter = rej; });

    imageCache.set(page, { status: 'loading', promise: outerPromise });

    (async () => {
        let lastError;
        for (let i = 0; i < candidates.length; i++) {
            const s = candidates[i];
            try {
                const src = await loadImageSrc(s, options.timeout || 6000);
                imageCache.set(page, { status: 'loaded', src });
                resolveOuter(src);
                for (let j = i + 1; j < candidates.length; j++) {
                    const better = candidates[j];
                    loadImageSrc(better, 8000).then(bsrc => {
                        imageCache.set(page, { status: 'loaded', src: bsrc });
                    }).catch(()=>{});
                }
                return;
            } catch (err) {
                lastError = err;
            }
        }
        imageCache.set(page, { status: 'error' });
        rejectOuter(lastError || new Error('no-src'));
    })();

    return outerPromise;
}

function showSpinner(show) {
    if (!spinner) return;
    spinner.classList.toggle('hidden', !show);
    spinner.setAttribute('aria-hidden', String(!show));
}

function showImageError(show, html) {
    if (!imageError) return;
    if (show) {
        imageError.innerHTML = html || 'عذراً: لم نتمكن من تحميل الصفحة.';
        imageError.classList.remove('hidden');
    } else {
        imageError.classList.add('hidden');
    }
}

// ---------- showPage with vertical container scrolling & preloading ----------
async function showPage(p) {
    if (p < 1 || p > IMAGE_COUNT) return;
    currentPage = p;
    localStorage.setItem("lastPage", p);

    // Suppress accidental nav events that might follow
    ignoreNavUntil = Date.now() + 350;

    showImageError(false);
    showSpinner(true);

    const cached = imageCache.get(p);
    if (cached && cached.status === 'loaded' && cached.src) {
        setImageSrc(cached.src, p);
        showSpinner(false);
    } else {
        try {
            const src = await preloadImage(p, { timeout: 6000 });
            setImageSrc(src, p);
            showSpinner(false);
        } catch (err) {
            showSpinner(false);
            const attempts = getCandidatesFor(p).map(u => `<div style="font-size:0.83rem;color:#ffd;">${u}</div>`).join('');
            let hint = '';
            if (location.protocol === 'file:') {
                hint = '<div style="font-size:0.85rem;color:#fbb;margin-top:6px;">تشغيل من ملف محلي (file://) قد يمنع بعض متصفحات التلفاز تحميل الصور. أنصح باستخدام HTTPS (مثلاً GitHub Pages).</div>';
            }
            showImageError(true, `<div>فشل تحميل الصفحة ${p}.</div>${attempts}${hint}<div><button id="retry-btn">حاول مرة أخرى</button></div>`);
            const retryBtn = document.getElementById('retry-btn');
            if (retryBtn) retryBtn.onclick = () => { showImageError(false); showPage(p); };
            console.error('load page error', p, err);
            return;
        }
    }

    [p - 1, p + 1, p - 2, p + 2].forEach(n => {
        if (n >= 1 && n <= IMAGE_COUNT) preloadImage(n, { timeout: 7000 }).catch(()=>{});
    });

    try { container.scrollTop = 0; } catch (e) { window.scrollTo(0,0); }
}

function setImageSrc(src, pageNumber) {
    img.src = src;
    img.alt = `صفحة ${pageNumber}`;
    img.style.width = '100vw';
    img.style.height = 'auto';
}

// ---------- Focus & accessibility ----------
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
        try { focusables[focusIndex].focus({ preventScroll: true }); } catch (e) { try { focusables[focusIndex].focus(); } catch{} }
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

    // prevent immediate nav events just after closing
    ignoreNavUntil = Date.now() + 300;
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
                d.textContent = `${s.id ? s.id + '. ' : ''}${s.name}`;
                d.onclick = () => {
                    closeMenu();
                    showPage(s.startPage);
                };
                list.appendChild(d);
                enableMouseFocus(d);
            });

        // Put focus on the search input so typing continues uninterrupted
        setFocusables([back, search, ...list.children]);
        focusIndex = 1; // index of search input
        updateFocus();
        try { search.focus(); } catch (e) {}
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
        focusIndex = 1; // keep focus on search
        updateFocus();
        try { search.focus(); } catch (e) {}
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

    go.onclick = (ev) => {
        // prevent accidental duplicate nav events: set ignore flag
        ignoreNavUntil = Date.now() + 350;

        const raw = input.value;
        // parse integer robustly
        const v = parseInt(String(raw).replace(/\D+/g,''), 10);
        if (Number.isInteger(v) && v >= 1 && v <= IMAGE_COUNT) {
            closeMenu();
            // delay tiny bit to ensure closeMenu's ignoreNavUntil takes effect before any nav keys
            setTimeout(() => showPage(v), 10);
        } else {
            // invalid input: show quick hint
            input.focus();
            input.select();
        }
    };

    input.setAttribute('type', 'text'); // text so backspace works identically across remotes; we'll parse digits
    input.setAttribute('inputmode', 'numeric');
    input.addEventListener('keydown', e => {
        // keep Enter inside input from bubbling to global handler (prevents duplicate)
        if (e.key === 'Enter') {
            e.stopPropagation();
            e.preventDefault();
            go.click();
        }
    });

    [back, input, go].forEach(enableMouseFocus);
    setFocusables([back, input, go]);
    focusIndex = 1; // ensure input stays focused for typing
    updateFocus();
    try { input.focus(); } catch (e) {}
}

/* ================= ريموت (لوحة مفاتيح) ================= */
/*
 - تجاهل مفاتيح التنقل العامة إذا كان الحدث داخل حقل إدخال (INPUT/TEXTAREA/contentEditable)
 - تجاهل الأحداث إذا نحن ضمن فترة ignoreNavUntil (لتفادي double-action من الريموت)
*/
document.addEventListener("keydown", e => {
    // suppress nav during short windows after actions
    if (Date.now() < ignoreNavUntil) {
        return;
    }

    const target = e.target;
    const targetTag = target && target.tagName ? target.tagName.toUpperCase() : '';

    // If focus is inside an input/textarea/contentEditable we should not hijack Backspace/Enter/Arrows
    const focusInEditable = (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || (target && target.isContentEditable));

    if (mode === MODE.PAGE) {
        if (e.key === "ArrowUp") { container.scrollBy({ top: -120, behavior: 'smooth' }); e.preventDefault(); }
        if (e.key === "ArrowDown") { container.scrollBy({ top: 120, behavior: 'smooth' }); e.preventDefault(); }
        if (e.key === "ArrowRight") { showPage(Math.max(1, currentPage - 1)); e.preventDefault(); } // RTL: يمين = السابق
        if (e.key === "ArrowLeft") { showPage(Math.min(IMAGE_COUNT, currentPage + 1)); e.preventDefault(); }  // RTL: يسار = التالي
        if (e.key === "Enter") {
            // ignore Enter if it fired immediately on load (handled elsewhere) 
            if (Date.now() - startTime > 350) openMainMenu();
        }
        if (e.key === "PageUp") showPage(Math.max(1, currentPage - 10));
        if (e.key === "PageDown") showPage(Math.min(IMAGE_COUNT, currentPage + 10));
        return;
    }

    // In menus/search: ignore global handling for editing keys when focus is on an input
    if (focusInEditable) {
        // let the input handle the key (including Backspace)
        return;
    }

    // navigation inside menus
    if (e.key === "ArrowDown") moveFocus(1);
    if (e.key === "ArrowUp") moveFocus(-1);

    if (e.key === "Enter") {
        // execute the focused item
        // set a short ignore to prevent follow-up nav events
        ignoreNavUntil = Date.now() + 300;
        focusables[focusIndex]?.click();
    }

    if (e.key === "Backspace" || e.key === "Escape") {
        if (mode === MODE.MAIN) closeMenu();
        else openMainMenu();
    }
});

/* ========== بداية ========== */

if (location.protocol === 'file:') {
    console.warn('تشغيل من ملف محلي: بعض متصفحات التلفاز قد تمنع تحميل الصور. أنصح باستخدام HTTPS (GitHub Pages).');
}

showPage(currentPage).catch(()=>{});
