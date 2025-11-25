window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar");
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

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
  const TRANSITION_MS = 600;

  // initialize slides and dots
  slides.forEach((s, i) => {
    s.setAttribute("role", "group");
    s.setAttribute("aria-roledescription", "slide");
    s.setAttribute("aria-hidden", i === 0 ? "false" : "true");
    if (i === 0) s.classList.add("active");

    const dot = document.createElement("button");
    dot.className = "hero__dot";
    dot.setAttribute("aria-label", "Go to slide " + (i + 1));
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
    dot.dataset.index = i;
    dot.addEventListener("click", () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(dotsContainer.children);

  function show(index) {
    slides.forEach((s, i) => {
      const active = i === index;
      s.classList.toggle("active", active);
      s.setAttribute("aria-hidden", active ? "false" : "true");
      dots[i].setAttribute("aria-selected", active ? "true" : "false");
    });
    current = index;
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

  // Autoplay
  function startAutoplay() {
    stopAutoplay();
    interval = setInterval(next, AUTOPLAY_MS);
  }
  function stopAutoplay() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }
  function resetAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  // Controls
  nextBtn?.addEventListener("click", () => {
    next();
    resetAutoplay();
  });
  prevBtn?.addEventListener("click", () => {
    prev();
    resetAutoplay();
  });

  // Pause on hover/focus
  slider.addEventListener("mouseenter", stopAutoplay);
  slider.addEventListener("mouseleave", startAutoplay);
  slider.addEventListener("focusin", stopAutoplay);
  slider.addEventListener("focusout", startAutoplay);

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      next();
      resetAutoplay();
    }
    if (e.key === "ArrowLeft") {
      prev();
      resetAutoplay();
    }
  });

  // Touch / swipe support
  let touchStartX = 0;
  let touchEndX = 0;
  slider.addEventListener(
    "touchstart",
    (e) => {
      stopAutoplay();
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );
  slider.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleGesture();
      startAutoplay();
    },
    { passive: true }
  );
  function handleGesture() {
    const dx = touchEndX - touchStartX;
    const threshold = 40; // minimal px to count as swipe
    if (Math.abs(dx) > threshold) {
      if (dx < 0) next();
      else prev();
    }
  }

  // Start
  startAutoplay();

  // accessibility: allow images to be focusable for screen readers
  slides.forEach((s) => {
    const img = s.querySelector("img");
    if (img) img.setAttribute("role", "img");
  });
})();

// === GALERI DARI GOOGLE SHEET TANPA TABLETOP (CSV FETCH) === //
(function () {
  const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1Iziv9FbzyMrkOQSTNdcBKTlnV4OlPTD08S4FiqGUbZ8/edit?usp=sharing";

  const LOCAL_IMAGE_PREFIX = "../resources/img/";
  const CONTAINER_ID = "galeri-penampilan";

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderGallery(items) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    container.innerHTML = "";

    items.forEach((item) => {
      const no = item.no;
      const title = item.judul || "Tanpa Judul";
      let img = (item.image || "").trim();
      const desc = item.deskripsi || "";

      if (!img) img = LOCAL_IMAGE_PREFIX + "bg.jpg";
      else if (!/^https?:\/\//i.test(img)) img = LOCAL_IMAGE_PREFIX + img;

      const col = document.createElement("div");
      col.className = "col-12 col-sm-6 col-md-4 col-lg-3";

      col.innerHTML = `
        <div class="card h-100 shadow-sm border-0">
          <img src="${img}" class="card-img-top" alt="${escapeHtml(title)}" />
          <div class="card-body">
            <h5 class="card-title fw-bold">${escapeHtml(title)}</h5>
            <p class="card-text">${escapeHtml(desc)}</p>
          </div>
        </div>
      `;

      container.appendChild(col);
    });
  }

  function csvToJson(csv) {
    const lines = csv.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());

    return lines.slice(1).map((line) => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((h, i) => (obj[h] = values[i]));
      return obj;
    });
  }

  async function init() {
    try {
      const res = await fetch(SHEET_CSV_URL);
      const csv = await res.text();
      const items = csvToJson(csv);
      renderGallery(items);
    } catch (err) {
      console.error("CSV ERROR:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
