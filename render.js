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

  // --- Imágenes de fondo (hero, nosotros, banda CTA) ---
  function applyImages(images) {
    images = images || {};
    const hero = $("#heroBg");
    if (hero && images.hero) {
      hero.style.backgroundImage = `url("${images.hero}")`;
      hero.style.backgroundSize = "cover";
      hero.style.backgroundPosition = "center";
    }
    // Video de fondo del hero (si hay, cubre la foto; la foto queda de respaldo/poster)
    const vid = $("#heroVideo");
    if (vid) {
      if (images.hero) vid.setAttribute("poster", images.hero);
      if (images.heroVideo) {
        if (vid.getAttribute("src") !== images.heroVideo) vid.src = images.heroVideo;
        vid.classList.add("active");
        const pr = vid.play();
        if (pr && pr.catch) pr.catch(function () {});
      } else {
        vid.classList.remove("active");
        vid.removeAttribute("src");
        if (vid.load) vid.load();
      }
    }
    const about = $("#aboutPhoto");
    if (about && images.about) {
      about.style.backgroundImage = `url("${images.about}")`;
    }
    const cta = $("#ctaBg");
    if (cta && images.cta) {
      cta.style.backgroundImage = `url("${images.cta}")`;
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
    const wa = $("#contactWhatsapp");
    if (wa) {
      const digits = (ct.whatsapp || "").replace(/\D/g, "");
      if (digits) {
        const msg = encodeURIComponent("Hola TS Sports, me gustaría más información.");
        wa.href = "https://wa.me/" + digits + "?text=" + msg;
        wa.style.display = "";
      } else {
        wa.style.display = "none";
      }
    }
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
      const bg = p.image ? `url('${esc(p.image)}')` : (p.gradient || "linear-gradient(135deg,#0d3b66,#1b6ca8)");
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

  // --- Aliados (marquesina infinita; se duplica para el loop) ---
  function renderAllies() {
    const grid = $("#logosGrid");
    if (!grid) return;
    const one = (a) => a.logo
      ? `<div class="logo-box"><img src="${esc(a.logo)}" alt="${esc(a.name)}" style="max-height:54px;max-width:80%;object-fit:contain" /></div>`
      : `<div class="logo-box">${esc(a.name)}</div>`;
    const items = (CONTENT.allies || []).map(one).join("");
    // Duplicado para que el desplazamiento sea continuo (translateX -50%)
    grid.innerHTML = items + items;
  }

  // --- Animación de aparición (después de renderizar) ---
  function initReveal() {
    const els = document.querySelectorAll(
      ".section-head, .about-photo, .about-content, .service-card, .project-card, .testimonial, .contact-form, .stat, .cta-band-inner"
    );
    els.forEach((el) => { if (!el.classList.contains("reveal")) el.classList.add("reveal"); });
    const all = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
      }, { threshold: 0.12 });
      all.forEach((el) => io.observe(el));
    } else {
      all.forEach((el) => el.classList.add("visible"));
    }
  }

  // --- Contadores que suben al entrar en pantalla ---
  function setupCounters() {
    const nums = document.querySelectorAll(".stat-num, .ap-num");
    const run = (el) => {
      const raw = (el.textContent || "").trim();
      const m = raw.match(/^([\d.,]+)(.*)$/);
      if (!m) return;
      const target = parseFloat(m[1].replace(/,/g, ""));
      const suffix = m[2] || "";
      if (isNaN(target)) return;
      const dur = 1300, t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
  }

  // --- Parallax suave en la banda de impacto ---
  function initParallax() {
    const band = document.querySelector(".cta-band");
    const bg = $("#ctaBg");
    if (!band || !bg) return;
    let ticking = false;
    const update = () => {
      const rect = band.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        bg.style.transform = "translateY(" + (rect.top * 0.12) + "px)";
      }
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
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
    applyImages(CONTENT.images);
    applyContact(CONTENT.contact);
    renderAllies();
    setLang(detectLang());
    initReveal();
    setupCounters();
    initParallax();
  }

  window.TS_RENDER = { setLang: () => setLang(LANG === "es" ? "en" : "es") };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
