const IMAGE_COUNT = 604;
let currentPage = 1;

/* الحالات */
const MODE = {
    PAGE: "page",
    MENU_MAIN: "menu_main",
    MENU_SURAH: "menu_surah",
    MENU_JUZ: "menu_juz"
};

let currentMode = MODE.PAGE;
let focusIndex = 0;

const img = document.getElementById("quran-page-image");
const menuOverlay = document.getElementById("menu-overlay");
const menuBox = document.getElementById("menu-box");

/* آخر صفحة */
const saved = localStorage.getItem("lastPage");
if (saved) currentPage = parseInt(saved);

/* عرض صفحة */
function showPage(p) {
    if (p < 1 || p > IMAGE_COUNT) return;
    currentPage = p;
    localStorage.setItem("lastPage", p);
    img.src = `pages/page${p}.jpeg`;
    window.scrollTo(0, 0);
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

/* فوكس */
function updateFocus() {
    const items = menuBox.querySelectorAll(".menu-item");
    items.forEach((el, i) => {
        el.classList.toggle("focused", i === focusIndex);
    });
}

/* ================= سور ================= */

function openSurahMenu() {
    currentMode = MODE.MENU_SURAH;
    focusIndex = 0;

    menuBox.innerHTML = `
        <div class="menu-item">⬅ رجوع</div>
        <input class="search-box" id="surah-search" placeholder="بحث باسم السورة">
        <div class="scroll-container" id="surah-list"></div>
    `;

    const list = document.getElementById("surah-list");
    allSurahs.forEach(s => {
        const d = document.createElement("div");
        d.className = "menu-item";
        d.textContent = s.name;
        d.onclick = () => {
            closeMenu();
            showPage(s.startPage);
        };
        list.appendChild(d);
    });

    focusIndex = 2; // أول سورة
    updateFocus();
}

/* ================= أجزاء ================= */

function openJuzMenu() {
    currentMode = MODE.MENU_JUZ;
    focusIndex = 0;

    menuBox.innerHTML = `
        <div class="menu-item">⬅ رجوع</div>
        <input class="search-box" placeholder="بحث برقم الجزء">
        <div class="scroll-container" id="juz-list"></div>
    `;

    const list = document.getElementById("juz-list");
    allJuz.forEach(j => {
        const d = document.createElement("div");
        d.className = "menu-item";
        d.textContent = j.name;
        d.onclick = () => {
            closeMenu();
            showPage(j.startPage);
        };
        list.appendChild(d);
    });

    focusIndex = 2;
    updateFocus();
}

/* ================= ريموت ================= */

document.addEventListener("keydown", e => {

    /* الصفحة */
    if (currentMode === MODE.PAGE) {
        if (e.key === "ArrowDown") window.scrollBy(0, 80);
        if (e.key === "ArrowUp") window.scrollBy(0, -80);
        if (e.key === "ArrowRight") showPage(currentPage - 1);
        if (e.key === "ArrowLeft") showPage(currentPage + 1);
        if (e.key === "Enter") openMainMenu();
        return;
    }

    /* داخل القائمة */
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
            if (focusIndex === 2) alert("بحث الصفحات لاحقًا");
        } else {
            items[focusIndex]?.click();
        }
    }

    if (e.key === "Backspace" || e.key === "Escape") {
        if (currentMode === MODE.MENU_MAIN) closeMenu();
        else openMainMenu();
    }
});

/* بداية */
showPage(currentPage);