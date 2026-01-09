const IMAGE_COUNT = 604;
let currentPage = 1;

/* أوضاع التشغيل */
const MODE = {
    PAGE: "page",
    MENU_MAIN: "menu_main",
    MENU_SURAH: "menu_surah",
    MENU_JUZ: "menu_juz",
    MENU_PAGE: "menu_page"
};

let currentMode = MODE.PAGE;
let focusIndex = 0;

const img = document.getElementById("quran-page-image");
const menuOverlay = document.getElementById("menu-overlay");
const menuBox = document.getElementById("menu-box");

/* آخر صفحة */
const saved = localStorage.getItem("lastPage");
if (saved) currentPage = parseInt(saved);

/* ================= عرض الصفحة ================= */

function showPage(p) {
    if (p < 1 || p > IMAGE_COUNT) return;
    currentPage = p;
    localStorage.setItem("lastPage", p);
    img.src = `pages/page${p}.jpeg`;
    window.scrollTo({ top: 0, behavior: "instant" });
}

/* ================= القائمة ================= */

function openMainMenu() {
    currentMode = MODE.MENU_MAIN;
    focusIndex = 0;
    menuOverlay.classList.remove("hidden");

    menuBox.innerHTML = `
        <div class="menu-item">السور</div>
        <div class="menu-item">الأجزاء</div>
        <div class="menu-item">الصفحات</div>
    `;
    updateFocus();
}

function closeMenu() {
    menuOverlay.classList.add("hidden");
    currentMode = MODE.PAGE;
}

/* ================= فوكس ريموت ================= */

function updateFocus() {
    const items = menuBox.querySelectorAll(".menu-item");
    items.forEach((el, i) => {
        el.classList.toggle("focused", i === focusIndex);
    });
}

/* ================= سور ================= */

function openSurahMenu() {
    currentMode = MODE.MENU_SURAH;

    menuBox.innerHTML = `
        <div class="menu-item">⬅ رجوع</div>
        <input class="search-box" id="surah-search" placeholder="بحث باسم السورة">
        <div class="scroll-container" id="surah-list"></div>
    `;

    const list = document.getElementById("surah-list");
    const search = document.getElementById("surah-search");

    function render(filter = "") {
        list.innerHTML = "";
        allSurahs
            .filter(s => s.name.includes(filter))
            .forEach(s => {
                const d = document.createElement("div");
                d.className = "menu-item";
                d.textContent = s.name;
                d.onclick = () => {
                    closeMenu();
                    showPage(s.startPage);
                };
                list.appendChild(d);
            });
    }

    search.oninput = () => render(search.value);
    render();

    focusIndex = 2; // أول سورة
    updateFocus();
}

/* ================= أجزاء ================= */

function openJuzMenu() {
    currentMode = MODE.MENU_JUZ;

    menuBox.innerHTML = `
        <div class="menu-item">⬅ رجوع</div>
        <input class="search-box" id="juz-search" placeholder="بحث برقم الجزء">
        <div class="scroll-container" id="juz-list"></div>
    `;

    const list = document.getElementById("juz-list");
    const search = document.getElementById("juz-search");

    function render(filter = "") {
        list.innerHTML = "";
        allJuz
            .filter(j => j.name.includes(filter))
            .forEach(j => {
                const d = document.createElement("div");
                d.className = "menu-item";
                d.textContent = j.name;
                d.onclick = () => {
                    closeMenu();
                    showPage(j.startPage);
                };
                list.appendChild(d);
            });
    }

    search.oninput = () => render(search.value);
    render();

    focusIndex = 2;
    updateFocus();
}

/* ================= بحث الصفحات ================= */

function openPageMenu() {
    currentMode = MODE.MENU_PAGE;

    menuBox.innerHTML = `
        <div class="menu-item">⬅ رجوع</div>
        <input class="search-box" id="page-search" placeholder="اكتب رقم الصفحة (1–604)">
        <div class="menu-item" id="go-page">اذهب</div>
    `;

    const input = document.getElementById("page-search");
    document.getElementById("go-page").onclick = () => {
        const val = parseInt(input.value);
        if (val >= 1 && val <= IMAGE_COUNT) {
            closeMenu();
            showPage(val);
        }
    };

    focusIndex = 1;
    updateFocus();
}

/* ================= ريموت ================= */

document.addEventListener("keydown", e => {

    /* وضع الصفحة */
    if (currentMode === MODE.PAGE) {
        if (e.key === "ArrowDown") window.scrollBy(0, 80);
        if (e.key === "ArrowUp") window.scrollBy(0, -80);

        // ➡️ السابقة | ⬅️ التالية
        if (e.key === "ArrowRight") showPage(currentPage - 1);
        if (e.key === "ArrowLeft") showPage(currentPage + 1);

        if (e.key === "Enter") openMainMenu();
        return;
    }

    /* داخل القوائم */
    const items = menuBox.querySelectorAll(".menu-item");

    if (e.key === "ArrowDown") {
        focusIndex = Math.min(focusIndex + 1, items.length - 1);
        items[focusIndex]?.scrollIntoView({ block: "nearest" });
        updateFocus();
    }

    if (e.key === "ArrowUp") {
        focusIndex = Math.max(focusIndex - 1, 0);
        items[focusIndex]?.scrollIntoView({ block: "nearest" });
        updateFocus();
    }

    if (e.key === "Enter") {
        if (currentMode === MODE.MENU_MAIN) {
            if (focusIndex === 0) openSurahMenu();
            if (focusIndex === 1) openJuzMenu();
            if (focusIndex === 2) openPageMenu();
        } else {
            items[focusIndex]?.click();
        }
    }

    if (e.key === "Backspace" || e.key === "Escape") {
        if (currentMode === MODE.MENU_MAIN) closeMenu();
        else openMainMenu();
    }
});

/* ================= بداية ================= */

showPage(currentPage);
