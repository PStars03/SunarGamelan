// ===================== NAVBAR SCROLL =====================

window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    if (window.scrollY > 50) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  }
});

// ===================== HERO SLIDER =====================
(function () {
  const slider = document.querySelector("#hero");
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll(".hero__slide"));
  const dotsContainer = slider.querySelector(".hero__dots");
  const prevBtn = slider.querySelector(".hero__btn--prev");
  const nextBtn = slider.querySelector(".hero__btn--next");

  let current = 0;
  let interval = null;
  const AUTOPLAY_MS = 4500;

  slides.forEach((s, i) => {
    s.classList.toggle("active", i === 0);

    const dot = document.createElement("button");
    dot.className = "hero__dot";
    dot.dataset.index = i;
    dot.addEventListener("click", () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.children;

  function updateDots(i) {
    [...dots].forEach((d, idx) => {
      d.setAttribute("aria-selected", idx === i ? "true" : "false");
    });
  }

  function show(i) {
    slides.forEach((s, idx) => s.classList.toggle("active", idx === i));
    current = i;
    updateDots(i);
  }

  function next() {
    show((current + 1) % slides.length);
  }

  function prev() {
    show((current - 1 + slides.length) % slides.length);
  }

  function goTo(i) {
    show(i);
    resetAutoplay();
  }

  function startAutoplay() {
    stopAutoplay();
    interval = setInterval(next, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (interval) clearInterval(interval);
  }

  function resetAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  if (prevBtn) prevBtn.addEventListener("click", prev);
  if (nextBtn) nextBtn.addEventListener("click", next);

  slider.addEventListener("mouseenter", stopAutoplay);
  slider.addEventListener("mouseleave", startAutoplay);

  startAutoplay();
})();

// ===================== AMBIL DATA GOOGLE SHEET =====================
(function () {
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/1Iziv9FbzyMrkOQSTNdcBKTlnV4OlPTD08S4FiqGUbZ8/gviz/tq?gid=0&tqx=out:json";

  function parseGViz(text) {
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const cols = json.table.cols.map((c) => c.label.toLowerCase());
    return json.table.rows.map((row) => {
      const obj = {};
      row.c.forEach((cell, i) => {
        obj[cols[i]] = cell ? cell.v : "";
      });
      return obj;
    });
  }

  async function initGallery() {
    try {
      const res = await fetch(SHEET_URL);
      const text = await res.text();
      const items = parseGViz(text);

      window.ALL_GALLERY_ITEMS = items;

      if (document.getElementById("galeri-penampilan")) {
        renderLimitedGallery(items);
      }

      if (document.getElementById("all-gallery")) {
        initGalleryFeatures(); // filter + search + sort aktif
        loadFullGallery(); // render galeri full
      }
    } catch (err) {
      console.error("GViz Error:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", initGallery);
})();

// ===================== RENDERING GALERI (INDEX) =====================

function renderLimitedGallery(data) {
  const container = document.getElementById("galeri-penampilan");
  if (!container) return;

  container.innerHTML = "";

  const LIMIT = 6;
  data.slice(0, LIMIT).forEach((item) => createGalleryCard(item, container));

  const btn = document.getElementById("lihat-selengkapnya");
  if (btn) {
    if (data.length > LIMIT) btn.classList.remove("d-none");
    else btn.classList.add("d-none");
  }
  translateGalleryOnly();
}

// ===================== PAGINATION (GALERI.HTML) =====================
let CURRENT_PAGE = 1;
const ITEMS_PER_PAGE = 15;

function loadFullGallery() {
  const container = document.getElementById("all-gallery");
  if (!container) return;

  const items = window.ALL_GALLERY_ITEMS || [];
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  const lang = getCurrentLang();
  const prevText = translations[lang]?.pagination_prev || "Previous";
  const nextText = translations[lang]?.pagination_next || "Next";

  // ===== Render Galeri =====
  const start = (CURRENT_PAGE - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;

  container.innerHTML = "";
  items.slice(start, end).forEach((item) => createGalleryCard(item, container));

  // ===== Render Pagination Numbers =====
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  // Previous Button
  pagination.innerHTML += `
    <li class="page-item ${CURRENT_PAGE === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="prev">${prevText}</a>
    </li>
  `;

  // Number Buttons
  for (let i = 1; i <= totalPages; i++) {
    pagination.innerHTML += `
      <li class="page-item ${i === CURRENT_PAGE ? "active" : ""}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }

  // Next Button
  pagination.innerHTML += `
    <li class="page-item ${CURRENT_PAGE === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="next">${nextText}</a>
    </li>
  `;

  // ===== Pagination Click Handler =====
  pagination.querySelectorAll(".page-link").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const page = btn.dataset.page;

      if (page === "prev" && CURRENT_PAGE > 1) CURRENT_PAGE--;
      else if (page === "next" && CURRENT_PAGE < totalPages) CURRENT_PAGE++;
      else if (!isNaN(page)) CURRENT_PAGE = Number(page);

      loadFullGallery();
    });
  });
  translateGalleryOnly();
}

let allItems = [];
let filteredItems = [];

// Dipanggil setelah data Sheet siap
function initGalleryFeatures() {
  allItems = window.ALL_GALLERY_ITEMS || [];
  filteredItems = [...allItems];

  isiDropdownKategori();
  setupFilterListeners();
  applyFilters();
}

// =============== ISI KATEGORI ===============
function isiDropdownKategori() {
  const select = document.getElementById("filterKategori");
  if (!select) return;

  const map = new Map(); // catId -> catEn
  allItems.forEach((item) => {
    const catId = item.kategori || "";
    const catEn = item.kategori_en || catId;
    if (catId) map.set(catId, catEn);
  });

  select.innerHTML = `<option value="all">Semua Kategori</option>`;

  map.forEach((catEn, catId) => {
    const opt = document.createElement("option");
    opt.value = catId; // VALUE tetap ID biar filter tetap jalan
    opt.dataset.catId = catId;
    opt.dataset.catEn = catEn;
    opt.textContent = getCurrentLang() === "id" ? catId : catEn;
    select.appendChild(opt);
  });
}

// =============== EVENT LISTENER ===============
function setupFilterListeners() {
  document.getElementById("filterKategori")?.addEventListener("change", applyFilters);
  document.getElementById("searchInput")?.addEventListener("input", applyFilters);
  document.getElementById("sortSelect")?.addEventListener("change", applyFilters);
}

// =============== FILTER ENGINE ===============
function applyFilters() {
  if (!allItems || allItems.length === 0) return;
  const lang = getCurrentLang();

  const kategori = document.getElementById("filterKategori")?.value || "all";
  const searchTerm = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const sortType = document.getElementById("sortSelect")?.value || "az";

  filteredItems = allItems.filter((item) => {
    const catId = item.kategori || "";
    const judulAktif = (lang === "id" ? item.judul : item.judul_en || item.judul) || "";

    const cocokKategori = kategori === "all" || catId === kategori;
    const cocokSearch = judulAktif.toLowerCase().includes(searchTerm);

    return cocokKategori && cocokSearch;
  });

  // sorting pakai judul aktif
  const getTitle = (it) => (lang === "id" ? it.judul : it.judul_en || it.judul) || "";

  if (sortType === "az") {
    filteredItems.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
  } else if (sortType === "za") {
    filteredItems.sort((a, b) => getTitle(b).localeCompare(getTitle(a)));
  } else if (sortType === "newest") {
    filteredItems.sort((a, b) => b.no - a.no);
  } else if (sortType === "oldest") {
    filteredItems.sort((a, b) => a.no - b.no);
  }

  renderFiltered();
  translateGalleryOnly(); // penting biar judul/kategori card langsung update
}

// =============== RENDER (INDEX + GALERI.HTML) ===============
function renderFiltered() {
  const containerIndex = document.getElementById("galeri-penampilan");
  const containerFull = document.getElementById("all-gallery");

  if (containerIndex) {
    containerIndex.innerHTML = "";
    filteredItems.slice(0, 6).forEach((item) => createGalleryCard(item, containerIndex));
  }

  if (containerFull) {
    containerFull.innerHTML = "";
    filteredItems.forEach((item) => createGalleryCard(item, containerFull));
  }
  translateGalleryOnly();
}

// ===================== GALLERY i18n HELPERS =====================
let LAST_MODAL_ITEM = null;

function getCurrentLang() {
  return localStorage.getItem("lang") || "id";
}

function translateGalleryOnly() {
  const lang = getCurrentLang();

  // update judul card galeri
  document.querySelectorAll(".gallery-title").forEach((el) => {
    el.textContent = lang === "id" ? el.dataset.titleId : el.dataset.titleEn;
  });

  // update kategori card (kalau ditampilkan)
  document.querySelectorAll(".gallery-cat").forEach((el) => {
    el.textContent = lang === "id" ? el.dataset.catId : el.dataset.catEn;
  });

  // update modal/lightbox kalau lagi kebuka
  const modalEl = document.getElementById("galleryModal");
  if (modalEl?.classList.contains("show") && LAST_MODAL_ITEM) {
    document.getElementById("modal-title").textContent = lang === "id" ? LAST_MODAL_ITEM.dataset.titleId : LAST_MODAL_ITEM.dataset.titleEn;

    document.getElementById("modal-desc").textContent = lang === "id" ? LAST_MODAL_ITEM.dataset.descId : LAST_MODAL_ITEM.dataset.descEn;
  }

  // update dropdown kategori + sort label (kalau ada)
  translateCategoryFilterOptions(lang);
  translateSortOptions(lang);
}

function translateCategoryFilterOptions(lang) {
  const select = document.getElementById("filterKategori");
  if (!select) return;

  // option bilingual
  select.querySelectorAll("option[data-cat-id]").forEach((opt) => {
    opt.textContent = lang === "id" ? opt.dataset.catId : opt.dataset.catEn;
  });

  // placeholder pertama
  const first = select.querySelector("option[value='all']");
  if (first) first.textContent = lang === "id" ? "Semua Kategori" : "All Categories";
}

function translateSortOptions(lang) {
  const select = document.getElementById("sortSelect");
  if (!select) return;

  // option bilingual (kalau tidak ada dataset, pakai default)
  select.querySelectorAll("option[data-i18n-id]").forEach((opt) => {
    opt.textContent = lang === "id" ? opt.dataset.i18nId : opt.dataset.i18nEn;
  });
}

// ===================== TEMPLATE CARD + MODAL =====================
function createGalleryCard(item, container) {
  if (!item) return;

  // kolom dari sheet kamu
  const titleId = item.judul || "";
  const titleEn = item.judul_en || titleId;

  const descId = item.deskripsi || "";
  const descEn = item.deskripsi_en || descId;

  const catId = item.kategori || "";
  const catEn = item.kategori_en || catId;

  const imgUrl = item.image || "";

  const lang = getCurrentLang();
  const showTitle = lang === "id" ? titleId : titleEn;
  const showCat = lang === "id" ? catId : catEn;

  const col = document.createElement("div");
  col.classList.add("col-12", "col-sm-6", "col-lg-4", "mb-4");

  col.innerHTML = `
    <div class="card shadow-sm gallery-card" style="cursor:pointer;">
      <img
        src="${imgUrl}"
        class="card-img-top gallery-img"
        style="height:250px; object-fit:cover;"

        data-title-id="${titleId}"
        data-title-en="${titleEn}"
        data-desc-id="${descId}"
        data-desc-en="${descEn}"
        data-cat-id="${catId}"
        data-cat-en="${catEn}"
        data-img="${imgUrl}"
      />

      <div class="card-body text-center">
        <h5 class="card-title gallery-title"
            data-title-id="${titleId}"
            data-title-en="${titleEn}">
          ${showTitle}
        </h5>

        <!-- kategori tampil di card -->
        <small class="text-muted gallery-cat"
               data-cat-id="${catId}"
               data-cat-en="${catEn}">
          ${showCat}
        </small>
      </div>
    </div>
  `;

  col.addEventListener("click", () => {
    const langNow = getCurrentLang();

    LAST_MODAL_ITEM = col.querySelector(".gallery-img");

    const t = langNow === "id" ? titleId : titleEn;
    const d = langNow === "id" ? descId : descEn;

    document.getElementById("modal-title").textContent = t;
    document.getElementById("modal-image").src = imgUrl;
    document.getElementById("modal-desc").textContent = d;

    new bootstrap.Modal(document.getElementById("galleryModal")).show();
  });

  container.appendChild(col);
}

// ===================== i18n GLOBAL =====================
const translations = {
  id: {
    page_title: "Sunar Gamelan - Harmoni Tradisi Nusantara",
    brand_name: "Sunar Gamelan",

    nav_beranda: "Beranda",
    nav_about: "Tentang",
    nav_gallery: "Galeri",
    nav_contact: "Kontak",
    nav_wisata: "Wisata",

    hero1_title: "Sunar Gamelan",
    hero1_subtitle: "Harmoni Tradisi Nusantara — Musik, Budaya, Kebersamaan",
    hero1_cta: "Pelajari Lebih Lanjut",

    hero2_title: "Pertunjukan & Kolaborasi",
    hero2_subtitle: "Menggabungkan nada tradisional & suara kontemporer",
    hero2_cta: "Lihat Galeri",

    hero3_title: "Belajar & Bergabung",
    hero3_subtitle: "Workshop, sanggar, dan program anak-anak",
    hero3_cta: "Hubungi Kami",

    hero_prev_aria: "Sebelumnya",
    hero_next_aria: "Selanjutnya",
    hero_dots_aria: "Pilih slide",

    about_title: "Tentang Sunar Gamelan",
    about_text:
      "Sunar Gamelan adalah kelompok seni gamelan yang berdedikasi untuk melestarikan dan memperkenalkan musik tradisional Indonesia kepada dunia. Melalui harmoni suara logam, kayu, dan semangat kebersamaan, kami berkomitmen menghadirkan pengalaman musikal yang memukau dan penuh makna.",

    gallery_title: "Galeri Penampilan",
    gallery_more: "Lihat Selengkapnya",

    contact_title: "Hubungi Kami",
    contact_subtitle: "Ingin bekerja sama atau sekadar bertanya? Silakan isi formulir di bawah ini atau hubungi kami melalui informasi berikut.",

    form_name_label: "Nama Lengkap",
    form_name_ph: "Masukkan nama Anda",
    form_email_label: "Alamat Email",
    form_email_ph: "nama@email.com",
    form_message_label: "Pesan",
    form_message_ph: "Tulis pesan Anda di sini...",
    form_send_btn: "Kirim Pesan",

    info_address_label: "Alamat:",
    info_phone_label: "Telepon:",
    info_email_label: "Email:",
    info_social_label: "Ikuti kami di media sosial:",

    footer_copy: "© 2025 Sunar Gamelan. Semua hak cipta dilindungi.",

    gallery_page_title: "Galeri Lengkap - Sunar Gamelan",
    gallery_full_title: "Galeri Lengkap",
    gallery_search_ph: "Cari foto / judul…",
    gallery_category_ph: "Kategori",
    gallery_back_btn: "Kembali",
    pagination_prev: "Sebelumnya",
    pagination_next: "Selanjutnya",

    // ===== WISATA PAGE (ID) =====
    wisata_page_title: "Paket Wisata Desa Jarum - Sunar Gamelan",
    wisata_header_title: "Paket Wisata Desa Jarum, Bayat",
    wisata_header_subtitle: "Jelajahi budaya khas Bayat melalui pengalaman langsung: membatik, membuat gerabah, serta belajar seni tradisi gejog lesung dan gamelan bersama Sanggar Sunar Gamelan.",

    wisata_paket1_badge: "Paket 1",
    wisata_paket1_title: "Batik Kain & Gamelan",
    wisata_paket1_desc: "Belajar batik tulis langsung di kampung batik Desa Jarum, dilanjutkan pengalaman karawitan/gamelan khas Bayat.",
    wisata_paket1_li1: "Welcome drink & pengantar sejarah batik Bayat",
    wisata_paket1_li2: "Tur kampung batik & rumah perajin",
    wisata_paket1_li3: "Workshop batik kain (nyanting + pewarnaan)",
    wisata_paket1_li4: "Snack tradisional",
    wisata_paket1_li5: "Kelas gamelan pemula + kolaborasi mini performance",
    wisata_paket1_li6: "Belanja batik sebagai oleh-oleh",
    wisata_paket1_duration: "1 Hari (±6–7 jam)",
    wisata_paket1_min: "10 orang",

    wisata_paket2_badge: "Paket 2",
    wisata_paket2_title: "Gerabah & Gamelan",
    wisata_paket2_desc: "Kunjungan ke sentra gerabah Bayat, praktik membentuk tanah liat, dan ditutup dengan kelas gamelan bersama.",
    wisata_paket2_li1: "Pengantar tradisi gerabah Bayat",
    wisata_paket2_li2: "Tur sentra gerabah (olah tanah + pembakaran)",
    wisata_paket2_li3: "Workshop gerabah (putar / hand-building)",
    wisata_paket2_li4: "Snack tradisional",
    wisata_paket2_li5: "Kelas gamelan pemula + kolaborasi mini performance",
    wisata_paket2_li6: "Belanja gerabah & cinderamata",
    wisata_paket2_duration: "1 Hari (±6 jam)",
    wisata_paket2_min: "10 orang",

    wisata_paket3_badge: "Paket 3",
    wisata_paket3_title: "Gejog Lesung & Gamelan",
    wisata_paket3_desc: "Rasakan sensasi seni bunyi tradisional gejog lesung, lalu kolaborasi ritme dengan gamelan.",
    wisata_paket3_li1: "Pengantar & cerita tradisi gejog lesung",
    wisata_paket3_li2: "Demo gejog lesung oleh kelompok seni desa",
    wisata_paket3_li3: "Workshop gejog lesung interaktif",
    wisata_paket3_li4: "Snack tradisional",
    wisata_paket3_li5: "Kelas gamelan + kolaborasi mini performance",
    wisata_paket3_li6: "Foto bersama & suvenir desa",
    wisata_paket3_duration: "Halfday (±4–5 jam)",
    wisata_paket3_min: "15 orang",

    wisata_duration_label: "Durasi:",
    wisata_min_label: "Minimal peserta:",
    wisata_order_btn: "Pesan Paket",

    wisata_note_title: "Catatan Operasional",
    wisata_note_li1: "Harga menyesuaikan jumlah peserta & pilihan konsumsi.",
    wisata_note_li2: "Bisa request paket khusus (2D1N, homestay warga, atau agenda budaya tertentu).",
    wisata_note_li3: "Waktu terbaik berkunjung: pagi–siang.",
    wisata_back_home: "Kembali ke Beranda",
  },

  en: {
    page_title: "Sunar Gamelan - Harmony of Indonesian Tradition",
    brand_name: "Sunar Gamelan",

    nav_beranda: "Home",
    nav_about: "About",
    nav_gallery: "Gallery",
    nav_contact: "Contact",
    nav_wisata: "Tourism",

    hero1_title: "Sunar Gamelan",
    hero1_subtitle: "Harmony of the Archipelago — Music, Culture, Togetherness",
    hero1_cta: "Learn More",

    hero2_title: "Performances & Collaborations",
    hero2_subtitle: "Blending traditional tones with contemporary sounds",
    hero2_cta: "View Gallery",

    hero3_title: "Learn & Join",
    hero3_subtitle: "Workshops, studio classes, and kids programs",
    hero3_cta: "Contact Us",

    hero_prev_aria: "Previous",
    hero_next_aria: "Next",
    hero_dots_aria: "Choose slide",

    about_title: "About Sunar Gamelan",
    about_text:
      "Sunar Gamelan is a gamelan arts group dedicated to preserving and introducing Indonesia’s traditional music to the world. Through the harmony of metal, wood, and togetherness, we are committed to creating meaningful and captivating musical experiences.",

    gallery_title: "Performance Gallery",
    gallery_more: "See More",

    contact_title: "Contact Us",
    contact_subtitle: "Want to collaborate or just ask something? Fill out the form below or reach us through the information provided.",

    form_name_label: "Full Name",
    form_name_ph: "Enter your name",
    form_email_label: "Email Address",
    form_email_ph: "name@email.com",
    form_message_label: "Message",
    form_message_ph: "Write your message here...",
    form_send_btn: "Send Message",

    info_address_label: "Address:",
    info_phone_label: "Phone:",
    info_email_label: "Email:",
    info_social_label: "Follow us on social media:",

    footer_copy: "© 2025 Sunar Gamelan. All rights reserved.",

    gallery_page_title: "Full Gallery - Sunar Gamelan",
    gallery_full_title: "Full Gallery",
    gallery_search_ph: "Search photo / title…",
    gallery_category_ph: "Category",
    gallery_back_btn: "Back",
    pagination_prev: "Previous",
    pagination_next: "Next",

    // ===== WISATA PAGE (EN) =====
    wisata_page_title: "Jarum Village Tour Packages - Sunar Gamelan",
    wisata_header_title: "Jarum Village Tour Packages, Bayat",
    wisata_header_subtitle: "Explore Bayat’s unique culture through hands-on experiences: batik making, pottery crafting, and learning traditional gejog lesung and gamelan with Sunar Gamelan Studio.",

    wisata_paket1_badge: "Package 1",
    wisata_paket1_title: "Batik Cloth & Gamelan",
    wisata_paket1_desc: "Learn hand-drawn batik directly in Jarum’s batik village, then enjoy a Bayat-style gamelan class.",
    wisata_paket1_li1: "Welcome drink & introduction to Bayat batik history",
    wisata_paket1_li2: "Batik village tour & artisans’ homes",
    wisata_paket1_li3: "Batik workshop (waxing + coloring)",
    wisata_paket1_li4: "Traditional snacks",
    wisata_paket1_li5: "Beginner gamelan class + mini performance collaboration",
    wisata_paket1_li6: "Batik shopping as souvenirs",
    wisata_paket1_duration: "1 Day (±6–7 hours)",
    wisata_paket1_min: "Minimum 10 people",

    wisata_paket2_badge: "Package 2",
    wisata_paket2_title: "Pottery & Gamelan",
    wisata_paket2_desc: "Visit Bayat’s pottery center, practice shaping clay, and close with a gamelan class.",
    wisata_paket2_li1: "Introduction to Bayat pottery tradition",
    wisata_paket2_li2: "Pottery center tour (clay processing + firing)",
    wisata_paket2_li3: "Pottery workshop (wheel / hand-building)",
    wisata_paket2_li4: "Traditional snacks",
    wisata_paket2_li5: "Beginner gamelan class + mini performance collaboration",
    wisata_paket2_li6: "Pottery shopping & souvenirs",
    wisata_paket2_duration: "1 Day (±6 hours)",
    wisata_paket2_min: "Minimum 10 people",

    wisata_paket3_badge: "Package 3",
    wisata_paket3_title: "Gejog Lesung & Gamelan",
    wisata_paket3_desc: "Feel the traditional sound art of gejog lesung, then collaborate rhythms with gamelan.",
    wisata_paket3_li1: "Introduction & stories of gejog lesung tradition",
    wisata_paket3_li2: "Gejog lesung demo by local arts group",
    wisata_paket3_li3: "Interactive gejog lesung workshop",
    wisata_paket3_li4: "Traditional snacks",
    wisata_paket3_li5: "Gamelan class + mini performance collaboration",
    wisata_paket3_li6: "Group photo & village souvenirs",
    wisata_paket3_duration: "Half-day (±4–5 hours)",
    wisata_paket3_min: "Minimum 15 people",

    wisata_duration_label: "Duration:",
    wisata_min_label: "Minimum participants:",
    wisata_order_btn: "Book Package",

    wisata_note_title: "Operational Notes",
    wisata_note_li1: "Prices depend on group size & meal options.",
    wisata_note_li2: "Custom packages are available (2D1N, homestay, or specific cultural agendas).",
    wisata_note_li3: "Best visiting time: morning to noon.",
    wisata_back_home: "Back to Home",
  },
};

function applyTranslations(lang) {
  document.documentElement.lang = lang;

  // text node
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const val = translations?.[lang]?.[key];
    if (val != null) el.textContent = val;
  });

  // placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const val = translations?.[lang]?.[key];
    if (val != null) el.setAttribute("placeholder", val);
  });

  // aria-label
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.dataset.i18nAria;
    const val = translations?.[lang]?.[key];
    if (val != null) el.setAttribute("aria-label", val);
  });

  // update label kecil ID/EN di navbar
  const lbl = document.getElementById("current-lang-label");
  if (lbl) lbl.textContent = lang.toUpperCase();

  // update title halaman juga
  const titleEl = document.querySelector("title[data-i18n='page_title']");
  if (titleEl) titleEl.textContent = translations?.[lang]?.page_title || titleEl.textContent;
}

function setLanguage(lang) {
  localStorage.setItem("lang", lang);
  applyTranslations(lang);

  // update teks galeri + modal pakai dataset yang sudah ada
  translateGalleryOnly();

  // HANYA jalankan filter kalau memang di halaman galeri lengkap
  const isGalleryPage = !!document.getElementById("filterKategori") || !!document.getElementById("gallery-container-full");

  if (isGalleryPage) {
    applyFilters();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("lang") || "id";
  applyTranslations(saved);

  document.querySelectorAll(".lang-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLanguage(btn.dataset.lang);
    });
  });
});
