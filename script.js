// ===== Año en el footer =====
document.getElementById("year").textContent = new Date().getFullYear();

// ===== Toggle de idioma (render.js hace el trabajo) =====
const langToggle = document.getElementById("langToggle");
if (langToggle) {
  langToggle.addEventListener("click", () => {
    if (window.TS_RENDER) window.TS_RENDER.setLang();
  });
}

// ===== Menú móvil =====
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
menuBtn.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuBtn.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
});
nav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    nav.classList.remove("open");
    menuBtn.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  })
);

// ===== Formulario de contacto (demo, sin backend) =====
const form = document.getElementById("contactForm");
const status = document.getElementById("formStatus");
const MSG = {
  es: { ok: "¡Gracias! Tu mensaje fue enviado. Te contactaremos pronto.", err: "Por favor completa todos los campos correctamente." },
  en: { ok: "Thanks! Your message was sent. We'll be in touch soon.", err: "Please fill in all fields correctly." }
};

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const lang = document.documentElement.lang === "en" ? "en" : "es";
  if (!form.checkValidity()) {
    status.textContent = MSG[lang].err;
    status.className = "form-status err";
    form.reportValidity();
    return;
  }
  status.textContent = MSG[lang].ok;
  status.className = "form-status ok";
  form.reset();
});
