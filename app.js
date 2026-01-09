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

/* ================= صفحة ================= */

const saved = localStorage.getItem("lastPage");
if (saved) currentPage = +saved;

function showPage(p) {
    if (p < 1 || p > IMAGE_COUNT) return;
    currentPage = p;
    localStorage.setItem("lastPage", p);
    img.src = `pages/page${p}.jpeg`;
    window.scrollTo(0, 0);
}

/* ================= فوكس ================= */

function setFocusables(list) {
    focusables = list;
    focusIndex = list.length ? 0 : -1;
    updateFocus();
}

function updateFocus() {
    focusables.forEach((el, i) =>
        el.classList.toggle("focused", i === focusIndex)
    );
}

function moveFocus(dir) {
    if (!focusables.length) return;
    focusIndex = Math.max(0, Math.min(focusIndex + dir, focusables.length - 1));
    focusables[focusIndex].scrollIntoView({ block: "nearest" });
    updateFocus();
}

/* دعم الماوس */
function enableMouseFocus(el) {
    el.addEventListener("mouseenter", () => {
        focusIndex = focusables.indexOf(el);
        updateFocus();
    });
}

/* ================= القائمة الرئيسية ================= */

function openMainMenu() {
    mode = MODE.MAIN;
    menuOverlay.classList.remove("hidden");

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
    mode = MODE.PAGE;
}

/* ================= سور ================= */

function openSurahMenu() {
    mode = MODE.SURAH;

    menuBox.innerHTML = `
        <div class="menu-item">⬅ رجوع</div>
        <input class="search-box" placeholder="بحث باسم السورة">
        <div class="scroll-container"></div>
    `;

    const back = menuBox.children[0];
    const search = menuBox.children[1];
    const list = menuBox.children[2];

    back.onclick = openMainMenu;

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
        <input class="search-box" placeholder="بحث برقم الجزء">
        <div class="scroll-container"></div>
    `;

    const back = menuBox.children[0];
    const search = menuBox.children[1];
    const list = menuBox.children[2];

    back.onclick = openMainMenu;

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
        <input class="search-box" placeholder="رقم الصفحة">
        <div class="menu-item">اذهب</div>
    `;

    const [back, input, go] = menuBox.children;

    back.onclick = openMainMenu;
    go.onclick = () => {
        const v = +input.value;
        if (v >= 1 && v <= IMAGE_COUNT) {
            closeMenu();
            showPage(v);
        }
    };

    [back, input, go].forEach(enableMouseFocus);
    setFocusables([back, input, go]);
}

/* ================= ريموت ================= */

document.addEventListener("keydown", e => {

    if (mode === MODE.PAGE) {
        if (e.key === "ArrowUp") window.scrollBy(0, -80);
        if (e.key === "ArrowDown") window.scrollBy(0, 80);
        if (e.key === "ArrowRight") showPage(currentPage - 1);
        if (e.key === "ArrowLeft") showPage(currentPage + 1);
        if (e.key === "Enter") openMainMenu();
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

/* ================= بداية ================= */

showPage(currentPage);
