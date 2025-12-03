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
  const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1Iziv9FbzyMrkOQSTNdcBKTlnV4OlPTD08S4FiqGUbZ8/gviz/tq?gid=0&tqx=out:json";

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
}

// ===================== PAGINATION (GALERI.HTML) =====================
let CURRENT_PAGE = 1;
const ITEMS_PER_PAGE = 15;

function loadFullGallery() {
  const container = document.getElementById("all-gallery");
  if (!container) return;

  const items = window.ALL_GALLERY_ITEMS || [];
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

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
      <a class="page-link" href="#" data-page="prev">Previous</a>
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
      <a class="page-link" href="#" data-page="next">Next</a>
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

  const kategoriUnik = [...new Set(allItems.map((i) => i.kategori))];

  kategoriUnik.forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    select.appendChild(opt);
  });
}

// =============== EVENT LISTENER ===============
function setupFilterListeners() {
  document
    .getElementById("filterKategori")
    ?.addEventListener("change", applyFilters);
  document
    .getElementById("searchInput")
    ?.addEventListener("input", applyFilters);
  document
    .getElementById("sortSelect")
    ?.addEventListener("change", applyFilters);
}

// =============== FILTER ENGINE ===============
function applyFilters() {
  const kategori = document.getElementById("filterKategori")?.value || "";
  const searchTerm =
    document.getElementById("searchInput")?.value.toLowerCase() || "";
  const sortType = document.getElementById("sortSelect")?.value || "az";

  filteredItems = allItems.filter((item) => {
    const cocokKategori = kategori === "" || item.kategori === kategori;
    const cocokSearch = item.judul.toLowerCase().includes(searchTerm);
    return cocokKategori && cocokSearch;
  });

  // sorting
  if (sortType === "az") {
    filteredItems.sort((a, b) => a.judul.localeCompare(b.judul));
  } else if (sortType === "za") {
    filteredItems.sort((a, b) => b.judul.localeCompare(a.judul));
  } else if (sortType === "newest") {
    filteredItems.sort((a, b) => b.no - a.no);
  } else if (sortType === "oldest") {
    filteredItems.sort((a, b) => a.no - b.no);
  }

  renderFiltered();
}

// =============== RENDER (INDEX + GALERI.HTML) ===============
function renderFiltered() {
  const containerIndex = document.getElementById("galeri-penampilan");
  const containerFull = document.getElementById("all-gallery");

  if (containerIndex) {
    containerIndex.innerHTML = "";
    filteredItems
      .slice(0, 6)
      .forEach((item) => createGalleryCard(item, containerIndex));
  }

  if (containerFull) {
    containerFull.innerHTML = "";
    filteredItems.forEach((item) => createGalleryCard(item, containerFull));
  }
}

// ===================== TEMPLATE CARD + MODAL =====================

function createGalleryCard(item, container) {
  if (!item) return;

  const col = document.createElement("div");
  col.classList.add("col-12", "col-sm-6", "col-lg-4", "mb-4");

  col.innerHTML = `
    <div class="card shadow-sm gallery-card" style="cursor:pointer;">
      <img src="${item.image}" class="card-img-top" style="height:250px; object-fit:cover;">
      <div class="card-body text-center">
        <h5 class="card-title">${item.judul}</h5>
      </div>
    </div>
  `;

  col.addEventListener("click", () => {
    document.getElementById("modal-title").textContent = item.judul;
    document.getElementById("modal-image").src = item.image;
    document.getElementById("modal-desc").textContent = item.deskripsi;

    new bootstrap.Modal(document.getElementById("galleryModal")).show();
  });

  container.appendChild(col);
}

// ========== DARK MODE ==========
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle-dark");
  const saved = localStorage.getItem("darkMode");

  if (saved === "on") document.body.classList.add("dark");

  toggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark"))
      localStorage.setItem("darkMode", "on");
    else localStorage.setItem("darkMode", "off");
  });
});

// ===================== i18n GLOBAL =====================
const translations = {
  id: {
    page_title: "Sunar Gamelan - Harmoni Tradisi Nusantara",
    brand_name: "Sunar Gamelan",

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
    contact_subtitle:
      "Ingin bekerja sama atau sekadar bertanya? Silakan isi formulir di bawah ini atau hubungi kami melalui informasi berikut.",

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
  },

  en: {
    page_title: "Sunar Gamelan - Harmony of Indonesian Tradition",
    brand_name: "Sunar Gamelan",

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
    contact_subtitle:
      "Want to collaborate or just ask something? Fill out the form below or reach us through the information provided.",

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
  if (titleEl)
    titleEl.textContent =
      translations?.[lang]?.page_title || titleEl.textContent;
}

function setLanguage(lang) {
  localStorage.setItem("lang", lang);
  applyTranslations(lang);
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
