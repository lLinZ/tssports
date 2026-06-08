// ===== Pantalla de carga (se oculta al cargar) =====
(function () {
  const loader = document.getElementById("loader");
  if (!loader) return;
  const hide = () => loader.classList.add("loaded");
  // Se oculta al terminar de cargar (con un mínimo para que se note), y un tope de seguridad
  window.addEventListener("load", () => setTimeout(hide, 500));
  setTimeout(hide, 3000);
})();

// ===== Header transparente → sólido al hacer scroll =====
(function () {
  const header = document.getElementById("top");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

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

// ===== Formulario de contacto → abre WhatsApp con el mensaje redactado =====
const form = document.getElementById("contactForm");
const status = document.getElementById("formStatus");
const MSG = {
  es: { ok: "¡Listo! Te abrimos WhatsApp para enviar tu mensaje.", err: "Por favor completa todos los campos correctamente.", nowa: "No hay un número de WhatsApp configurado." },
  en: { ok: "Done! We're opening WhatsApp to send your message.", err: "Please fill in all fields correctly.", nowa: "No WhatsApp number is configured." }
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

  const name = (document.getElementById("name").value || "").trim();
  const email = (document.getElementById("email").value || "").trim();
  const message = (document.getElementById("message").value || "").trim();

  // El número sale del enlace de WhatsApp que render.js ya construyó
  const waLink = document.getElementById("contactWhatsapp");
  let digits = "";
  if (waLink && waLink.href) {
    const m = waLink.href.match(/wa\.me\/(\d+)/);
    if (m) digits = m[1];
  }
  if (!digits) {
    status.textContent = MSG[lang].nowa;
    status.className = "form-status err";
    return;
  }

  const text = (lang === "en")
    ? `Hi TS Sports! 👋\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    : `¡Hola TS Sports! 👋\n\nNombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`;

  // Guarda el lead en el CRM (no bloquea el flujo de WhatsApp)
  if (window.TS_STORE && window.TS_STORE.addLead) {
    window.TS_STORE.addLead({ brand: name, contact: name, email: email, notes: message }).catch(function () {});
  }

  window.open("https://wa.me/" + digits + "?text=" + encodeURIComponent(text), "_blank");

  status.textContent = MSG[lang].ok;
  status.className = "form-status ok";
  form.reset();
});
