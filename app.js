const IMAGE_COUNT = 604;
let currentPage = 1;

const img = document.getElementById("quran-page-image");
const pageContainer = document.getElementById("quran-page-container");
const menuOverlay = document.getElementById("menu-overlay");
const menuBox = document.getElementById("menu-box");

// تحميل آخر صفحة
const savedPage = localStorage.getItem("lastPage");
if (savedPage) currentPage = parseInt(savedPage);

// عرض الصفحة
function showPage(page) {
    if (page < 1 || page > IMAGE_COUNT) return;
    currentPage = page;
    localStorage.setItem("lastPage", page);
    img.src = `pages/page${page}.jpeg`;
    pageContainer.scrollTop = 0;
    img.focus(); // فوكس على الصورة لتعمل الأسهم على التلفزيون
}

// التحكم بالأسهم
document.addEventListener("keydown", (e) => {
    if (!menuOverlay.classList.contains("hidden")) {
        // التحكم بالقائمة
        const focusEl = document.activeElement;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            let next = focusEl.nextElementSibling;
            if (next) next.focus();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            let prev = focusEl.previousElementSibling;
            if (prev) prev.focus();
        } else if (e.key === "Enter") { // OK
            e.preventDefault();
            focusEl.click();
        } else if (e.key === "Backspace") { // Back
            closeMenu();
            img.focus();
        }
    } else {
        // التحكم بالصفحة
        if (e.key === "ArrowDown") pageContainer.scrollTop += 50;
        else if (e.key === "ArrowUp") pageContainer.scrollTop -= 50;
        else if (e.key === "ArrowLeft") showPage(currentPage - 1);
        else if (e.key === "ArrowRight") showPage(currentPage + 1);
        else if (e.key === "Enter") openMainMenu(); // OK يفتح القائمة
    }
});

// فتح وإغلاق القائمة
function openMainMenu() {
    menuOverlay.classList.remove("hidden");
    renderMainMenu();
    // فوكس على أول عنصر في القائمة الرئيسية
    const firstItem = menuBox.querySelector(".menu-item");
    if (firstItem) firstItem.focus();
}

function closeMenu() {
    menuOverlay.classList.add("hidden");
    img.focus(); // يرجع الفوكس للصفحة
}

// القائمة الرئيسية
function renderMainMenu() {
    menuBox.innerHTML = `
        <div class="menu-item" onclick="openSurahMenu()">السور</div>
        <div class="menu-item" onclick="openJuzMenu()">الأجزاء</div>
        <div class="menu-item" onclick="openPageSearch()">الصفحات</div>
    `;
    const firstItem = menuBox.querySelector(".menu-item");
    if (firstItem) firstItem.focus();
}

// ============================================
// السور
function openSurahMenu() {
    menuBox.innerHTML = `
        <div class="menu-item" onclick="renderMainMenu()">⬅ رجوع</div>
        <input type="text" placeholder="بحث باسم السورة" class="search-box" id="surah-search">
        <div class="scroll-container" id="surah-list"></div>
    `;
    const listContainer = document.getElementById("surah-list");
    const searchInput = document.getElementById("surah-search");
    searchInput.focus();

    function renderList(filter="") {
        listContainer.innerHTML = "";
        allSurahs.filter(s => s.name.includes(filter)).forEach((surah, idx) => {
            const btn = document.createElement("div");
            btn.className = "menu-item";
            btn.tabIndex = 0;
            btn.textContent = `${surah.id}. ${surah.name}`;
            btn.onclick = () => {
                closeMenu();
                showPage(surah.startPage);
            };
            listContainer.appendChild(btn);
        });
    }

    renderList();
    searchInput.oninput = () => renderList(searchInput.value);
}

// ============================================
// الأجزاء
function openJuzMenu() {
    menuBox.innerHTML = `
        <div class="menu-item" onclick="renderMainMenu()">⬅ رجوع</div>
        <input type="text" placeholder="بحث برقم الجزء" class="search-box" id="juz-search">
        <div class="scroll-container" id="juz-list"></div>
    `;
    const listContainer = document.getElementById("juz-list");
    const searchInput = document.getElementById("juz-search");
    searchInput.focus();

    function renderList(filter="") {
        listContainer.innerHTML = "";
        allJuz.filter(j => j.name.includes(filter)).forEach(juz => {
            const btn = document.createElement("div");
            btn.className = "menu-item";
            btn.tabIndex = 0;
            btn.textContent = `${juz.name}`;
            btn.onclick = () => {
                closeMenu();
                showPage(juz.startPage);
            };
            listContainer.appendChild(btn);
        });
    }

    renderList();
    searchInput.oninput = () => renderList(searchInput.value);
}

// ============================================
// البحث برقم الصفحة
function openPageSearch() {
    menuBox.innerHTML = `
        <div class="menu-item" onclick="renderMainMenu()">⬅ رجوع</div>
        <input type="number" id="page-input" placeholder="رقم الصفحة (1-${IMAGE_COUNT})" class="search-box">
        <div class="menu-item" id="go-page">اذهب</div>
    `;
    document.getElementById("page-input").focus();
    document.getElementById("go-page").onclick = () => {
        const val = parseInt(document.getElementById("page-input").value);
        if (val >= 1 && val <= IMAGE_COUNT) {
            closeMenu();
            showPage(val);
        } else {
            alert("رقم الصفحة غير صالح");
        }
    };
}

// ============================================
// عرض الصفحة عند البداية
// ============================================
showPage(currentPage);
