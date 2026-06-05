/* =====================================================================
   ADMIN — Panel del CRM. Edita el contenido y lo guarda en el store
   (Supabase si está configurado, o el navegador en modo prueba).
   ===================================================================== */
(function () {
  const S = window.TS_STORE;
  let data = null; // copia de trabajo del contenido

  const $ = (id) => document.getElementById(id);
  const escAttr = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const escHtml = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---- Etiquetas amigables para los textos ----
  const LABELS = {
    "nav.about": "Menú · Nosotros", "nav.services": "Menú · Servicios", "nav.projects": "Menú · Proyectos", "nav.clients": "Menú · Aliados", "nav.contact": "Menú · Contacto",
    "hero.eyebrow": "Hero · Línea superior", "hero.title": "Hero · Título", "hero.sub": "Hero · Subtítulo", "hero.cta1": "Hero · Botón 1", "hero.cta2": "Hero · Botón 2",
    "stat.n1": "Stat 1 · Número", "stats.years": "Stat 1 · Texto", "stat.n2": "Stat 2 · Número", "stats.brands": "Stat 2 · Texto", "stat.n3": "Stat 3 · Número", "stats.areas": "Stat 3 · Texto", "stat.n4": "Stat 4 · Número", "stats.passion": "Stat 4 · Texto",
    "about.eyebrow": "Nosotros · Línea superior", "about.title": "Nosotros · Título", "about.p1": "Nosotros · Párrafo 1", "about.p2": "Nosotros · Párrafo 2",
    "about.v1t": "Valor 1 · Título", "about.v1d": "Valor 1 · Texto", "about.v2t": "Valor 2 · Título", "about.v2d": "Valor 2 · Texto",
    "about.v3t": "Valor 3 · Título", "about.v3d": "Valor 3 · Texto", "about.v4t": "Valor 4 · Título", "about.v4d": "Valor 4 · Texto",
    "serv.eyebrow": "Servicios · Línea superior", "serv.title": "Servicios · Título",
    "proj.eyebrow": "Proyectos · Línea superior", "proj.title": "Proyectos · Título", "proj.quote": "Testimonial · Frase", "proj.quoteby": "Testimonial · Autor",
    "ally.eyebrow": "Aliados · Línea superior", "ally.title": "Aliados · Título",
    "contact.eyebrow": "Contacto · Línea superior", "contact.title": "Contacto · Título", "contact.p1": "Contacto · Texto", "contact.email": "Contacto · Etiqueta Email", "contact.social": "Contacto · Etiqueta Redes",
    "form.name": "Formulario · Nombre", "form.email": "Formulario · Email", "form.message": "Formulario · Mensaje", "form.send": "Formulario · Botón",
    "footer.tag": "Pie · Lema", "footer.rights": "Pie · Derechos"
  };

  /* =================== AUTENTICACIÓN =================== */
  async function boot() {
    const cloud = S.isCloud();
    $("loginMode").textContent = cloud
      ? "Conectado a Supabase (CRM real). Usa el email y la contraseña que creaste en Supabase."
      : "Modo prueba: Supabase no está configurado. Puedes entrar con cualquier dato; los cambios se guardan solo en este navegador.";

    const user = await S.getUser();
    if (user) showApp(); else showLogin();
  }

  function showLogin() { $("adminApp").hidden = true; $("loginScreen").style.display = "grid"; }
  async function showApp() {
    $("loginScreen").style.display = "none";
    $("adminApp").hidden = false;
    const cloud = S.isCloud();
    $("modeTag").textContent = cloud ? "● CRM en la nube" : "● Modo prueba (local)";
    $("modeTag").className = "admin-mode-tag" + (cloud ? " cloud" : "");
    data = await S.loadContent();
    renderAll();
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginStatus").textContent = "";
    try {
      await S.signIn($("loginEmail").value.trim(), $("loginPass").value);
      await showApp();
    } catch (err) {
      $("loginStatus").textContent = "No se pudo iniciar sesión: " + (err.message || err);
    }
  });

  $("logoutBtn").addEventListener("click", async () => { await S.signOut(); showLogin(); });

  /* =================== TABS =================== */
  $("adminTabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + tab.dataset.tab));
  });

  /* =================== RENDER DE PANELES =================== */
  function renderAll() {
    renderColors(); renderImages(); renderTexts();
    renderServices(); renderProjects(); renderAllies(); renderContact();
  }

  const COLOR_DEFS = [
    { key: "navy", label: "Azul oscuro (hero y pie)" },
    { key: "navy2", label: "Azul secundario" },
    { key: "accent", label: "Color principal (botones)" },
    { key: "accent2", label: "Acento verde" },
    { key: "bgAlt", label: "Fondo de secciones" }
  ];

  function renderColors() {
    $("panel-colors").innerHTML =
      `<h2>Colores</h2><p class="panel-desc">Cambia la paleta del sitio. Los cambios se aplican al guardar.</p>
      <div class="card"><div class="grid-2">` +
      COLOR_DEFS.map((c) => {
        const v = (data.colors && data.colors[c.key]) || "#000000";
        return `<div class="color-row">
          <input type="color" value="${escAttr(v)}" data-scope="colors" data-key="${c.key}" data-sync="color">
          <div class="color-meta"><strong>${c.label}</strong>
            <input type="text" value="${escAttr(v)}" data-scope="colors" data-key="${c.key}" data-sync="text"></div>
        </div>`;
      }).join("") + `</div></div>`;
  }

  function imageField(scope, idx, url, label) {
    const has = url && url.length;
    const idxAttr = (idx != null) ? `data-idx="${idx}"` : "";
    return `<div class="field"><label>${label}</label>
      <div class="img-preview" ${has ? `style="background-image:url('${escAttr(url)}')"` : ""}>${has ? "" : "Sin imagen"}</div>
      <div class="img-actions">
        <span class="btn btn-ghost btn-sm file-btn" style="color:var(--ink);border-color:var(--line)">Subir imagen
          <input type="file" accept="image/*" data-img="1" data-scope="${scope}" ${idxAttr}></span>
        ${has ? `<button class="remove-btn" data-action="clear-img" data-scope="${scope}" ${idxAttr}>Quitar</button>` : ""}
      </div>
      <input type="url" placeholder="o pega una URL de imagen..." value="${has ? escAttr(url) : ""}" data-img-url="1" data-scope="${scope}" ${idxAttr} style="margin-top:8px">
    </div>`;
  }

  function renderImages() {
    $("panel-images").innerHTML =
      `<h2>Imágenes</h2><p class="panel-desc">Imagen de fondo del hero (la portada). Recomendado: 1600×900px.</p>
      <div class="card">` + imageField("hero", null, (data.images && data.images.hero) || "", "Imagen del hero") + `</div>`;
  }

  function renderTexts() {
    const es = data.texts.es, en = data.texts.en;
    const keys = Object.keys(es);
    const rows = keys.map((k) => {
      const label = LABELS[k] || k;
      const long = (es[k] && es[k].length > 45) || /<br/.test(es[k] || "");
      const field = (lang, val) => long
        ? `<textarea data-scope="text" data-lang="${lang}" data-key="${escAttr(k)}">${escHtml(val)}</textarea>`
        : `<input type="text" data-scope="text" data-lang="${lang}" data-key="${escAttr(k)}" value="${escAttr(val)}">`;
      return `<div class="text-row"><div class="tr-label">${label}</div>${field("es", es[k])}${field("en", en[k])}</div>`;
    }).join("");
    $("panel-texts").innerHTML =
      `<h2>Textos</h2><p class="panel-desc">Edita los textos en español e inglés. Puedes usar &lt;br&gt; para saltos de línea.</p>
      <div class="card"><div class="lang-head"><span></span><span>Español</span><span>English</span></div>${rows}</div>`;
  }

  function renderServices() {
    const cards = (data.services || []).map((s, i) =>
      `<div class="card item-card">
        <div class="card-head"><h3>Servicio ${i + 1}</h3>
          <button class="remove-btn" data-action="remove-service" data-idx="${i}">Eliminar</button></div>
        <div class="field"><label>Ícono (emoji o símbolo)</label>
          <input type="text" value="${escAttr(s.icon)}" data-scope="service" data-idx="${i}" data-field="icon" style="max-width:120px"></div>
        <div class="grid-2">
          <div><div class="field"><label>Título (ES)</label><input type="text" value="${escAttr(s.es.title)}" data-scope="service" data-idx="${i}" data-lang="es" data-field="title"></div>
            <div class="field"><label>Descripción (ES)</label><textarea data-scope="service" data-idx="${i}" data-lang="es" data-field="desc">${escHtml(s.es.desc)}</textarea></div></div>
          <div><div class="field"><label>Título (EN)</label><input type="text" value="${escAttr(s.en.title)}" data-scope="service" data-idx="${i}" data-lang="en" data-field="title"></div>
            <div class="field"><label>Descripción (EN)</label><textarea data-scope="service" data-idx="${i}" data-lang="en" data-field="desc">${escHtml(s.en.desc)}</textarea></div></div>
        </div>
      </div>`).join("");
    $("panel-services").innerHTML =
      `<h2>Servicios</h2><p class="panel-desc">Agrega, edita o elimina las tarjetas de servicios.</p>${cards}
      <button class="add-btn" data-action="add-service">+ Agregar servicio</button>`;
  }

  function renderProjects() {
    const cards = (data.projects || []).map((p, i) =>
      `<div class="card item-card">
        <div class="card-head"><h3>Proyecto ${i + 1}</h3>
          <button class="remove-btn" data-action="remove-project" data-idx="${i}">Eliminar</button></div>
        ${imageField("project", i, p.image || "", "Imagen del proyecto")}
        <div class="field"><label>Degradado (si no hay imagen)</label>
          <input type="text" value="${escAttr(p.gradient)}" data-scope="project" data-idx="${i}" data-field="gradient"></div>
        <div class="grid-2">
          <div><div class="field"><label>Etiqueta (ES)</label><input type="text" value="${escAttr(p.es.tag)}" data-scope="project" data-idx="${i}" data-lang="es" data-field="tag"></div>
            <div class="field"><label>Título (ES)</label><input type="text" value="${escAttr(p.es.title)}" data-scope="project" data-idx="${i}" data-lang="es" data-field="title"></div>
            <div class="field"><label>Descripción (ES)</label><textarea data-scope="project" data-idx="${i}" data-lang="es" data-field="desc">${escHtml(p.es.desc)}</textarea></div></div>
          <div><div class="field"><label>Etiqueta (EN)</label><input type="text" value="${escAttr(p.en.tag)}" data-scope="project" data-idx="${i}" data-lang="en" data-field="tag"></div>
            <div class="field"><label>Título (EN)</label><input type="text" value="${escAttr(p.en.title)}" data-scope="project" data-idx="${i}" data-lang="en" data-field="title"></div>
            <div class="field"><label>Descripción (EN)</label><textarea data-scope="project" data-idx="${i}" data-lang="en" data-field="desc">${escHtml(p.en.desc)}</textarea></div></div>
        </div>
      </div>`).join("");
    $("panel-projects").innerHTML =
      `<h2>Proyectos</h2><p class="panel-desc">Agrega, edita o elimina los proyectos destacados.</p>${cards}
      <button class="add-btn" data-action="add-project">+ Agregar proyecto</button>`;
  }

  function renderAllies() {
    const items = (data.allies || []).map((a, i) =>
      `<div class="card item-card">
        <div class="card-head"><h3>Aliado ${i + 1}</h3>
          <button class="remove-btn" data-action="remove-ally" data-idx="${i}">Eliminar</button></div>
        <div class="field"><label>Nombre (si no hay logo)</label>
          <input type="text" value="${escAttr(a.name)}" data-scope="ally" data-idx="${i}" data-field="name"></div>
        ${imageField("ally", i, a.logo || "", "Logo (imagen)")}
      </div>`).join("");
    $("panel-allies").innerHTML =
      `<h2>Aliados</h2><p class="panel-desc">Logos de marcas aliadas. Si subes un logo, se muestra la imagen; si no, el nombre.</p>
      <div class="grid-auto">${items}</div>
      <button class="add-btn" data-action="add-ally" style="margin-top:16px">+ Agregar aliado</button>`;
  }

  function renderContact() {
    const c = data.contact || {};
    $("panel-contact").innerHTML =
      `<h2>Contacto</h2><p class="panel-desc">Datos de contacto y redes sociales.</p>
      <div class="card">
        <div class="field"><label>Email</label><input type="email" value="${escAttr(c.email)}" data-scope="contact" data-key="email"></div>
        <div class="field"><label>Instagram (URL)</label><input type="url" value="${escAttr(c.instagram)}" data-scope="contact" data-key="instagram"></div>
        <div class="field"><label>LinkedIn (URL)</label><input type="url" value="${escAttr(c.linkedin)}" data-scope="contact" data-key="linkedin"></div>
      </div>`;
  }

  /* =================== EDICIÓN (delegación) =================== */
  function setImg(ds, url) {
    if (ds.scope === "hero") data.images.hero = url;
    else if (ds.scope === "project") data.projects[+ds.idx].image = url;
    else if (ds.scope === "ally") data.allies[+ds.idx].logo = url;
  }

  document.addEventListener("input", (e) => {
    const t = e.target, ds = t.dataset;
    if (!ds || !ds.scope || ds.img === "1" /* file */) return;
    const v = t.value;
    switch (ds.scope) {
      case "colors":
        data.colors[ds.key] = v;
        if (ds.sync === "color") { const tw = t.closest(".color-row").querySelector('[data-sync="text"]'); if (tw) tw.value = v; }
        if (ds.sync === "text") { const cw = t.closest(".color-row").querySelector('[data-sync="color"]'); if (cw && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) cw.value = v; }
        break;
      case "contact": data.contact[ds.key] = v; break;
      case "text": data.texts[ds.lang][ds.key] = v; break;
      case "service":
        if (ds.lang) data.services[+ds.idx][ds.lang][ds.field] = v;
        else data.services[+ds.idx][ds.field] = v;
        break;
      case "project":
        if (ds.imgUrl === "1") setImg(ds, v);
        else if (ds.lang) data.projects[+ds.idx][ds.lang][ds.field] = v;
        else data.projects[+ds.idx][ds.field] = v;
        break;
      case "ally":
        if (ds.imgUrl === "1") setImg(ds, v);
        else data.allies[+ds.idx][ds.field] = v;
        break;
      case "hero": if (ds.imgUrl === "1") setImg(ds, v); break;
    }
  });

  // Subida de archivos
  document.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.img === "1" && t.files && t.files[0]) {
      const ds = t.dataset;
      toast("Subiendo imagen...");
      try {
        const url = await S.uploadImage(t.files[0]);
        setImg(ds, url);
        if (ds.scope === "hero") renderImages();
        else if (ds.scope === "project") renderProjects();
        else if (ds.scope === "ally") renderAllies();
        toast("Imagen lista ✔");
      } catch (err) { toast("Error al subir: " + (err.message || err), true); }
    }
  });

  // Botones (add / remove / clear-img)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const a = btn.dataset.action, idx = +btn.dataset.idx;
    switch (a) {
      case "add-service":
        data.services.push({ icon: "✦", es: { title: "Nuevo servicio", desc: "Descripción..." }, en: { title: "New service", desc: "Description..." } });
        renderServices(); break;
      case "remove-service": data.services.splice(idx, 1); renderServices(); break;
      case "add-project":
        data.projects.push({ image: "", gradient: "linear-gradient(135deg,#0d3b66,#1b6ca8)", es: { tag: "Etiqueta", title: "Nuevo proyecto", desc: "Descripción..." }, en: { tag: "Tag", title: "New project", desc: "Description..." } });
        renderProjects(); break;
      case "remove-project": data.projects.splice(idx, 1); renderProjects(); break;
      case "add-ally": data.allies.push({ name: "Marca", logo: "" }); renderAllies(); break;
      case "remove-ally": data.allies.splice(idx, 1); renderAllies(); break;
      case "clear-img": setImg(btn.dataset, "");
        if (btn.dataset.scope === "hero") renderImages();
        else if (btn.dataset.scope === "project") renderProjects();
        else if (btn.dataset.scope === "ally") renderAllies();
        break;
    }
  });

  /* =================== GUARDAR =================== */
  $("saveBtn").addEventListener("click", async () => {
    $("saveBtn").disabled = true;
    try {
      await S.saveContent(data);
      toast("Cambios guardados ✔");
    } catch (err) {
      toast("Error al guardar: " + (err.message || err), true);
    } finally { $("saveBtn").disabled = false; }
  });

  let toastTimer;
  function toast(msg, isErr) {
    const el = $("saveToast");
    el.textContent = msg;
    el.className = "save-toast show" + (isErr ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = "save-toast"; }, 2600);
  }

  boot();
})();
