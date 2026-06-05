/* =====================================================================
   RENDER — Pinta la web pública a partir del contenido del store.
   Aplica colores, imágenes, textos y las listas dinámicas
   (servicios, proyectos, aliados). Maneja el cambio de idioma.
   ===================================================================== */
(function () {
  let CONTENT = null;
  let LANG = "es";

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // --- Colores ---
  function applyColors(c) {
    if (!c) return;
    const root = document.documentElement.style;
    if (c.navy) root.setProperty("--navy", c.navy);
    if (c.navy2) root.setProperty("--navy-2", c.navy2);
    if (c.accent) root.setProperty("--accent", c.accent);
    if (c.accent2) root.setProperty("--accent-2", c.accent2);
    if (c.bgAlt) root.setProperty("--bg-alt", c.bgAlt);
  }

  // --- Imagen del hero ---
  function applyHero(images) {
    const bg = $(".hero-bg");
    if (!bg) return;
    if (images && images.hero) {
      bg.style.backgroundImage =
        `linear-gradient(160deg, rgba(10,31,60,.78), rgba(13,43,82,.82)), url("${images.hero}")`;
      bg.style.backgroundSize = "cover";
      bg.style.backgroundPosition = "center";
    } else {
      bg.style.backgroundImage = "";
    }
  }

  // --- Contacto ---
  function applyContact(ct) {
    if (!ct) return;
    const email = $("#contactEmail");
    if (email && ct.email) { email.textContent = ct.email; email.href = "mailto:" + ct.email; }
    const ig = $("#contactInstagram");
    if (ig) ig.href = ct.instagram || "#";
    const li = $("#contactLinkedin");
    if (li) li.href = ct.linkedin || "#";
  }

  // --- Textos fijos (data-i18n) ---
  function applyTexts(lang) {
    const dict = (CONTENT.texts && CONTENT.texts[lang]) || {};
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.innerHTML = dict[key];
    });
  }

  // --- Servicios ---
  function renderServices(lang) {
    const grid = $("#servicesGrid");
    if (!grid) return;
    grid.innerHTML = (CONTENT.services || []).map((s) => {
      const t = s[lang] || s.es || {};
      return `<article class="service-card">
        <div class="service-icon">${esc(s.icon || "✦")}</div>
        <h3>${esc(t.title)}</h3>
        <p>${esc(t.desc)}</p>
      </article>`;
    }).join("");
  }

  // --- Proyectos ---
  function renderProjects(lang) {
    const grid = $("#projectsGrid");
    if (!grid) return;
    grid.innerHTML = (CONTENT.projects || []).map((p) => {
      const t = p[lang] || p.es || {};
      const bg = p.image ? `url("${p.image}")` : (p.gradient || "linear-gradient(135deg,#0d3b66,#1b6ca8)");
      const cover = p.image ? "background-size:cover;background-position:center;" : "";
      return `<article class="project-card">
        <div class="project-img" style="background-image:${bg};${cover}"></div>
        <div class="project-body">
          <span class="project-tag">${esc(t.tag)}</span>
          <h3>${esc(t.title)}</h3>
          <p>${esc(t.desc)}</p>
        </div>
      </article>`;
    }).join("");
  }

  // --- Aliados (independiente del idioma) ---
  function renderAllies() {
    const grid = $("#logosGrid");
    if (!grid) return;
    grid.innerHTML = (CONTENT.allies || []).map((a) => {
      if (a.logo) return `<div class="logo-box"><img src="${esc(a.logo)}" alt="${esc(a.name)}" style="max-height:54px;max-width:80%;object-fit:contain" /></div>`;
      return `<div class="logo-box">${esc(a.name)}</div>`;
    }).join("");
  }

  // --- Animación de aparición (después de renderizar) ---
  function initReveal() {
    const els = document.querySelectorAll(
      ".section-head, .col-text, .col-card, .service-card, .project-card, .testimonial, .logo-box, .contact-form, .stat"
    );
    els.forEach((el) => el.classList.add("reveal"));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
      }, { threshold: 0.12 });
      els.forEach((el) => io.observe(el));
    } else {
      els.forEach((el) => el.classList.add("visible"));
    }
  }

  // --- Idioma ---
  function setLang(lang) {
    LANG = (lang === "en") ? "en" : "es";
    document.documentElement.lang = LANG;
    applyTexts(LANG);
    renderServices(LANG);
    renderProjects(LANG);
    document.querySelectorAll(".lang-opt").forEach((o) =>
      o.classList.toggle("active", o.dataset.lang === LANG));
    try { localStorage.setItem("ts_lang", LANG); } catch (e) {}
  }

  function detectLang() {
    try {
      const saved = localStorage.getItem("ts_lang");
      if (saved) return saved;
    } catch (e) {}
    return (navigator.language && navigator.language.startsWith("en")) ? "en" : "es";
  }

  // --- Arranque ---
  async function init() {
    CONTENT = await window.TS_STORE.loadContent();
    window.__TS_CONTENT = CONTENT; // por si se necesita inspeccionar
    applyColors(CONTENT.colors);
    applyHero(CONTENT.images);
    applyContact(CONTENT.contact);
    renderAllies();
    setLang(detectLang());
    initReveal();
  }

  window.TS_RENDER = { setLang: () => setLang(LANG === "es" ? "en" : "es") };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
