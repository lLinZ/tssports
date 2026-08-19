/* =====================================================================
   CRM de Patrocinios — dashboard de marcas sobre Supabase.
   Reutiliza config.js (mismas claves del proyecto).
   ===================================================================== */
(function () {
  const CFG = window.TS_SUPABASE || {};
  const HAS_CLOUD = !!(CFG.url && CFG.anonKey && window.supabase);
  const sb = HAS_CLOUD ? window.supabase.createClient(CFG.url, CFG.anonKey) : null;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = (n) => "$" + (Number(n) || 0).toLocaleString("en-US");
  const fdate = (s) => { try { return new Date(s).toLocaleDateString("es"); } catch (e) { return ""; } };
  const fdatetime = (s) => { try { return new Date(s).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };

  /* ▼▼▼ MODELO DEL CLIENTE — fases sí/no + zonas de prospectores.
     Prospección: la marca está cargada con sus datos obligatorios
                  (contacto, cargo, email y logo). Se calcula sola.
     Aproximación: estatus sí/no + vía (Conocido / WhatsApp).
     Propuesta:    estatus sí/no + descripción obligatoria.
     Valor:        100% del valor de la propuesta pasada. ▼▼▼ */
  const ZONAS = ["Caracas", "Centro", "Lara", "Andes-Zulia", "Oriente"];
  const FASE_COLORS = { aprox: "#3b82f6", prosp: "#f59e0b", prop: "#16c79a" };
  /* ▲▲▲ ▲▲▲ */

  const CHECK = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  /* Traduce los errores de Supabase a algo accionable.
     El más común: la base de datos se quedó sin las columnas nuevas
     (PGRST204 / 42703) porque falta correr el SQL de migración. */
  /* Cuando RLS filtra una fila, PostgREST NO devuelve error: el update/delete
     simplemente afecta 0 filas y responde 204. Por eso hay que pedir .select()
     y contar lo que volvió, o la interfaz canta "Guardado/Eliminada" sin
     haber tocado nada (pasa con los leads del formulario web, que van sin dueño). */
  const RLS_MSG = "No se modificó nada: no tienes permiso sobre esta marca.\n" +
    "Las marcas sin dueño (las que entran por el formulario web) y las de otro comercial " +
    "solo las puede editar o borrar un admin.";

  function explainError(error, prefijo) {
    const msg = (error && error.message) || String(error || "");
    const code = error && error.code;
    if (code === "PGRST204" || code === "42703" || /column .* does not exist|schema cache/i.test(msg)) {
      const col = (msg.match(/'([^']+)' column/) || msg.match(/column \S*?\.?(\w+) does not exist/) || [])[1];
      return "A la base de datos le faltan columnas" + (col ? ` (falta «${col}»)` : "") + ".\n" +
             "Abre Supabase → SQL Editor → New query, pega el archivo " +
             "supabase-ARREGLO-URGENTE.sql del proyecto y dale Run. Después recarga esta página.";
    }
    if (code === "42501" || /row-level security|permission denied/i.test(msg)) {
      return "Tu usuario no tiene permiso para esta acción (RLS de Supabase).\n" +
             "Corre supabase-ARREGLO-URGENTE.sql y verifica el rol de tu usuario.";
    }
    return (prefijo ? prefijo + ": " : "") + msg;
  }

  // ¿Qué datos obligatorios de Prospección le faltan a la marca?
  function prospFaltan(d) {
    const faltan = [];
    if (!(d.brand || "").trim()) faltan.push("marca");
    if (!(d.contact || "").trim()) faltan.push("contacto");
    if (!(d.cargo || "").trim()) faltan.push("cargo");
    if (!(d.email || "").trim()) faltan.push("email");
    if (!(d.logo || "").trim()) faltan.push("logo");
    return faltan;
  }
  const prospOk = (d) => prospFaltan(d).length === 0;

  function avanceKey(d) {
    const prosp = prospOk(d);
    if (d.st_aproximacion && prosp && d.st_propuesta) return "completa";
    if (d.st_propuesta) return "propuesta";
    if (prosp) return "prospeccion";
    if (d.st_aproximacion) return "aproximacion";
    return "sin";
  }

  let DEALS = [];
  let PROFILE = null; // { id, name, role, zona }

  /* ---------- Auth ---------- */
  async function boot() {
    // Zonas en el select del modal (el filtro fZona se llena al saber el rol)
    $("f-zona").innerHTML = `<option value="">Sin zona</option>` + ZONAS.map((z) => `<option value="${z}">${z}</option>`).join("");

    if (!HAS_CLOUD) {
      $("loginMode").textContent = "Supabase no está configurado (config.js). El CRM necesita la nube para funcionar.";
      showLogin();
      return;
    }
    $("loginMode").textContent = "Conectado a Supabase. Usa el mismo email y contraseña del panel.";
    // getSession() lee la sesión guardada localmente (sin llamada al servidor),
    // así no se ve el login un instante cuando ya hay sesión iniciada.
    const { data } = await sb.auth.getSession();
    if (data && data.session) showApp(); else showLogin();
  }
  function showLogin() { $("crmApp").hidden = true; $("loginScreen").style.display = "grid"; }
  async function showApp() {
    $("loginScreen").style.display = "none"; $("crmApp").hidden = false;
    await loadProfile();
    await load();
  }

  // Carga el perfil (rol + nombre + zona) del usuario logueado
  async function loadProfile() {
    const { data: s } = await sb.auth.getSession();
    const user = s && s.session && s.session.user;
    if (!user) return;
    let prof = null;
    let { data, error } = await sb.from("profiles").select("id,name,role,zona").eq("id", user.id).maybeSingle();
    if (error && (error.code === "42703" || error.code === "PGRST204")) {
      // La columna zona todavía no existe (falta correr el SQL): leemos sin ella
      // en vez de dar el perfil por perdido y acabar creando uno falso.
      ({ data } = await sb.from("profiles").select("id,name,role").eq("id", user.id).maybeSingle());
      if (data) data.zona = "";
    }
    prof = data;
    if (!prof) { // por si el trigger aún no creó el perfil
      const name = (user.email || "").split("@")[0];
      await sb.from("profiles").upsert({ id: user.id, email: user.email, name }).select();
      prof = { id: user.id, name, role: "comercial", zona: "" };
    }
    PROFILE = prof;
    const tag = $("userTag");
    if (tag) {
      const rol = prof.role === "admin" ? "Admin" : "Comercial";
      tag.textContent = "● " + (prof.name || user.email) + " · " + rol + (prof.zona ? " · " + prof.zona : "");
      tag.className = "admin-mode-tag" + (prof.role === "admin" ? " cloud" : "");
    }
    // El enlace a la vista de usuarios solo lo ve el admin
    if ($("usersBtn")) $("usersBtn").style.display = (prof.role === "admin") ? "" : "none";

    // El admin puede filtrar por agente y por zona, y editar la zona de una marca
    if (prof.role === "admin") {
      $("f-zona").disabled = false;
      const fz = $("fZona");
      fz.innerHTML = `<option value="">Todas las zonas</option>` +
        ZONAS.map((z) => `<option value="${z}">${z}</option>`).join("") +
        `<option value="__sin">Sin zona</option>`;
      fz.style.display = "";
      const { data } = await sb.from("profiles").select("id,name,email,zona").order("name");
      const sel = $("fAgent");
      if (sel && data) {
        sel.innerHTML = `<option value="">Todos los agentes</option>` +
          data.map((p) => `<option value="${p.id}">${esc(p.name || p.email)}${p.zona ? " — " + esc(p.zona) : ""}</option>`).join("");
        sel.style.display = "";
      }
    }
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginStatus").textContent = "";
    try {
      // El email no distingue mayúsculas (se normaliza); la contraseña sí, se manda tal cual
      const email = $("loginEmail").value.trim().toLowerCase();
      const { error } = await sb.auth.signInWithPassword({ email, password: $("loginPass").value });
      if (error) throw error;
      await showApp();
    } catch (err) {
      const m = (err && err.message) || String(err);
      $("loginStatus").textContent = /invalid login credentials/i.test(m)
        ? "Email o contraseña incorrectos. Revisa que la contraseña esté bien escrita (distingue mayúsculas)."
        : "No se pudo iniciar sesión: " + m;
    }
  });
  $("logoutBtn").addEventListener("click", async () => { await sb.auth.signOut(); showLogin(); });
  $("refreshBtn").addEventListener("click", load);

  /* ---------- Datos ---------- */
  async function load() {
    const { data, error } = await sb.from("deals").select("*").order("created_at", { ascending: false });
    if (error) {
      // Un error de carga se queda a la vista: el toast se va en 2 segundos y no se lee
      $("crmBoard").innerHTML = `<div class="brand-empty">${esc(explainError(error, "Error al cargar"))}</div>`;
      toast("Error al cargar", true);
      return;
    }
    DEALS = data || [];
    render();
  }

  /* ---------- Render ---------- */
  function render() {
    const aprox = DEALS.filter((d) => d.st_aproximacion).length;
    const prosp = DEALS.filter(prospOk).length;
    const props = DEALS.filter((d) => d.st_propuesta).length;
    const valorProps = DEALS.reduce((s, d) => s + (d.st_propuesta ? (Number(d.value) || 0) : 0), 0);
    $("crmStats").innerHTML =
      `<div class="crm-stat"><div class="cs-num">${DEALS.length}</div><div class="cs-label">Marcas</div></div>
       <div class="crm-stat aprox"><div class="cs-num">${aprox}</div><div class="cs-label">Aproximación</div></div>
       <div class="crm-stat prosp"><div class="cs-num">${prosp}</div><div class="cs-label">Prospección</div></div>
       <div class="crm-stat win"><div class="cs-num">${props}</div><div class="cs-label">Propuesta</div></div>
       <div class="crm-stat pipe"><div class="cs-num">${money(valorProps)}</div><div class="cs-label">Valor propuestas / año</div></div>`;
    renderZones();
    renderGrid();
  }

  // Gráfico sumario por zona: total de cada proceso (aprox/prosp/propuesta) + valor
  function renderZones() {
    const panel = $("zonePanel");
    const isAdmin = PROFILE && PROFILE.role === "admin";
    const groups = {};
    DEALS.forEach((d) => {
      const k = d.zona || "Sin zona";
      const g = groups[k] || (groups[k] = { total: 0, aprox: 0, prosp: 0, prop: 0, valor: 0 });
      g.total++;
      if (d.st_aproximacion) g.aprox++;
      if (prospOk(d)) g.prosp++;
      if (d.st_propuesta) { g.prop++; g.valor += Number(d.value) || 0; }
    });
    // El admin siempre ve las 5 zonas (aunque estén vacías); el comercial solo las suyas
    let keys = isAdmin ? ZONAS.slice() : [];
    Object.keys(groups).forEach((k) => { if (!keys.includes(k)) keys.push(k); });
    if (!keys.length) { panel.hidden = true; return; }
    panel.hidden = false;
    const max = Math.max(1, ...keys.map((k) => { const g = groups[k]; return g ? Math.max(g.aprox, g.prosp, g.prop) : 0; }));
    const bar = (n, color) =>
      `<div class="zbar-row"><div class="zbar" style="--zc:${color};width:${n ? Math.max(6, Math.round((n / max) * 100)) : 0}%"></div><span class="zbar-num">${n}</span></div>`;
    $("zoneChart").innerHTML = keys.map((k) => {
      const g = groups[k] || { total: 0, aprox: 0, prosp: 0, prop: 0, valor: 0 };
      return `<div class="zone-row">
        <div class="zone-head"><span class="zone-name">${esc(k)}</span><span class="zone-meta">${g.total} marca${g.total === 1 ? "" : "s"} · <strong>${money(g.valor)}</strong></span></div>
        <div class="zone-bars">${bar(g.aprox, FASE_COLORS.aprox)}${bar(g.prosp, FASE_COLORS.prosp)}${bar(g.prop, FASE_COLORS.prop)}</div>
      </div>`;
    }).join("");
  }

  function renderGrid() {
    const q = ($("fSearch").value || "").toLowerCase().trim();
    const av = $("fAvance").value;
    const sort = $("fSort").value;
    const zona = $("fZona") ? $("fZona").value : "";
    const agent = $("fAgent") ? $("fAgent").value : "";
    let items = DEALS.slice();
    if (q) items = items.filter((d) => (d.brand || "").toLowerCase().includes(q) || (d.contact || "").toLowerCase().includes(q));
    if (av) items = items.filter((d) => avanceKey(d) === av);
    if (zona) items = items.filter((d) => zona === "__sin" ? !d.zona : d.zona === zona);
    if (agent) items = items.filter((d) => d.owner === agent);
    items.sort((a, b) => {
      if (sort === "value-desc") return (b.value || 0) - (a.value || 0);
      if (sort === "value-asc") return (a.value || 0) - (b.value || 0);
      if (sort === "name") return (a.brand || "").localeCompare(b.brand || "");
      return new Date(b.created_at) - new Date(a.created_at);
    });
    const grid = $("crmBoard");
    if (!items.length) { grid.innerHTML = `<div class="brand-empty">No hay marcas que coincidan.</div>`; return; }
    grid.innerHTML = items.map(brandCard).join("");
  }

  function brandCard(d) {
    const logo = d.logo
      ? `<img src="${esc(d.logo)}" alt="${esc(d.brand)}" />`
      : `<div class="logo-ph">${esc((d.brand || "?").trim().charAt(0).toUpperCase())}</div>`;
    // Orden del formato del cliente: Aproximación / Prospección / Propuesta
    const prosp = prospOk(d);
    const fase = (key, label, on, extra) =>
      `<span class="bs-item ${on ? "done" : ""}" data-fase="${key}"><span class="bs-dot">${on ? CHECK : ""}</span>${label}${extra || ""}</span>`;
    const chips =
      fase("aproximacion", "Aproximación", !!d.st_aproximacion, d.st_aproximacion && d.aprox_via ? `<em class="bs-via">${esc(d.aprox_via)}</em>` : "") +
      fase("prospeccion", "Prospección", prosp, prosp ? "" : `<em class="bs-via">faltan datos</em>`) +
      fase("propuesta", "Propuesta", !!d.st_propuesta);
    const src = d.source === "web" ? `<span class="deal-source">Web</span>` : "";
    const owner = (PROFILE && PROFILE.role === "admin" && d.owner_name)
      ? `<span class="brand-owner"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(d.owner_name)}${d.zona ? " · " + esc(d.zona) : ""}</span>` : "";
    return `<article class="brand-card" data-id="${d.id}">
      ${src}
      <div class="brand-logo">${logo}</div>
      <div class="brand-name">${esc(d.brand) || "(sin nombre)"}</div>
      <div class="brand-stages">${chips}</div>
      <div class="brand-foot">
        <span class="brand-value">${(d.st_propuesta && d.value) ? money(d.value) + " /año" : "—"}</span>
        ${owner}
      </div>
    </article>`;
  }

  // Interacción de la cuadrícula (delegación)
  $("crmBoard").addEventListener("click", async (e) => {
    const card = e.target.closest(".brand-card");
    if (!card) return;
    const deal = DEALS.find((d) => d.id === card.dataset.id);
    if (!deal) return;
    const chip = e.target.closest(".bs-item");
    if (chip) {
      const kind = chip.dataset.fase;
      if (kind === "prospeccion") { // se calcula sola: si falta algo, abrimos el detalle
        const faltan = prospFaltan(deal);
        if (faltan.length) toast("Para completar Prospección faltan: " + faltan.join(", "), true);
        openModal(deal);
        return;
      }
      if (kind === "propuesta" && !deal.st_propuesta && !(deal.propuesta_desc || "").trim()) {
        toast("Describe la propuesta en la ficha para poder marcarla", true);
        openModal(deal);
        return;
      }
      const key = "st_" + kind; // marcar/desmarcar sin abrir el modal
      deal[key] = !deal[key];
      renderGrid();
      const upd = {}; upd[key] = deal[key]; upd.updated_at = new Date().toISOString();
      // Marcar una fase de un lead web también lo adopta (mismo criterio que al editar)
      if (!deal.owner && PROFILE) { upd.owner = PROFILE.id; upd.owner_name = PROFILE.name || ""; }
      const { data, error } = await sb.from("deals").update(upd).eq("id", deal.id).select("id");
      if (error) { toast(explainError(error, "Error"), true); load(); return; }
      // 0 filas = RLS la filtró. Deshacemos el cambio optimista en vez de
      // dejar la tarjeta marcada con algo que no se guardó.
      if (!data || !data.length) { deal[key] = !deal[key]; renderGrid(); toast("Sin permiso para modificar esta marca", true); return; }
      render();
      return;
    }
    openModal(deal);
  });
  $("fSearch").addEventListener("input", renderGrid);
  $("fAvance").addEventListener("change", renderGrid);
  $("fSort").addEventListener("change", renderGrid);
  if ($("fZona")) $("fZona").addEventListener("change", renderGrid);
  if ($("fAgent")) $("fAgent").addEventListener("change", renderGrid);

  /* ---------- Modal: asistente en 3 pasos ---------- */
  const STEPS = 3;
  let STEP = 1;

  // En qué paso vive cada campo, para poder saltar al error
  const STEP_OF = {
    "f-brand": 1, "f-zona": 1, "f-prosp-via": 1, "logoUrl": 1,
    "f-contact": 2, "f-cargo": 2, "f-email": 2, "f-phone": 2, "f-notes": 2,
    "f-aprox-via": 3, "f-propuesta-desc": 3, "f-value": 3
  };

  function gotoStep(n) {
    STEP = Math.min(STEPS, Math.max(1, n));
    document.querySelectorAll(".wiz-pane").forEach((p) => { p.hidden = Number(p.dataset.pane) !== STEP; });
    document.querySelectorAll(".wiz-step").forEach((b) => {
      const s = Number(b.dataset.step);
      b.classList.toggle("active", s === STEP);
      b.classList.toggle("done", s < STEP);
    });
    $("wizBarFill").style.width = Math.round((STEP / STEPS) * 100) + "%";
    const editing = !!$("dealId").value;
    $("backBtn").hidden = STEP === 1;
    $("nextBtn").hidden = STEP === STEPS;
    // Al editar se puede guardar desde cualquier paso; al crear, solo al final
    $("saveBtn").hidden = !(editing || STEP === STEPS);
    $("saveBtn").textContent = editing ? "Guardar cambios" : "Guardar marca";
    // En el último paso Guardar es la acción principal; antes es secundaria (solo al editar)
    $("saveBtn").className = "btn btn-sm " + (STEP === STEPS ? "btn-primary" : "btn-ghost");
  }

  function setLogoPreview(url) {
    $("f-logo").value = url || "";
    $("logoPrev").innerHTML = url ? `<img src="${esc(url)}" alt="logo" />` : "Sin logo";
    $("logoUrl").value = url || "";
    updateProspStatus();
  }

  // Estado en vivo de Prospección dentro del modal (se recalcula al escribir)
  function updateProspStatus() {
    const el = $("prospStatus");
    if (!el) return;
    const campos = [
      ["marca", $("f-brand").value], ["logo", $("f-logo").value],
      ["contacto", $("f-contact").value], ["cargo", $("f-cargo").value], ["email", $("f-email").value]
    ];
    const faltan = campos.filter(([, v]) => !(v || "").trim()).map(([k]) => k);
    if (!faltan.length) { el.className = "fase-status ok"; el.textContent = "✔ Completa"; }
    else { el.className = "fase-status miss"; el.textContent = faltan.length + " por completar"; }
    const list = $("prospChecklist");
    if (list) {
      list.innerHTML = campos.map(([k, v]) => {
        const ok = !!(v || "").trim();
        return `<span class="fc-chk ${ok ? "ok" : ""}"><span class="fc-mark">${ok ? CHECK : ""}</span>${k}</span>`;
      }).join("");
    }
  }

  // Propuesta manda sobre la descripción y el valor; aproximación sobre la vía
  function syncFases() {
    const aproxOn = $("f-aproximacion").checked;
    const propOn = $("f-propuesta").checked;
    $("aproxViaWrap").hidden = !aproxOn;
    $("propuestaDescWrap").hidden = !propOn;
    $("aproxCard").classList.toggle("on", aproxOn);
    $("propCard").classList.toggle("on", propOn);
    updateProspStatus();
  }

  function showFormError(msg, focusId) {
    const el = $("formError");
    if (msg) {
      el.textContent = msg; el.hidden = false;
      if (focusId && STEP_OF[focusId]) gotoStep(STEP_OF[focusId]);
      if (focusId && $(focusId)) { $(focusId).classList.add("invalid"); $(focusId).focus(); }
    } else {
      el.hidden = true; el.textContent = "";
      document.querySelectorAll(".invalid").forEach((n) => n.classList.remove("invalid"));
    }
  }

  function openModal(deal) {
    deal = deal || {};
    $("modalTitle").textContent = deal.id ? (deal.brand || "Editar marca") : "Nueva marca";
    $("dealId").value = deal.id || "";
    setLogoPreview(deal.logo || "");
    $("f-brand").value = deal.brand || "";
    $("f-zona").value = deal.id ? (deal.zona || "") : ((PROFILE && PROFILE.zona) || "");
    $("f-contact").value = deal.contact || "";
    $("f-cargo").value = deal.cargo || "";
    $("f-email").value = deal.email || "";
    $("f-phone").value = deal.phone || "";
    $("f-prosp-via").value = deal.prospeccion_via || "";
    $("f-aproximacion").checked = !!deal.st_aproximacion;
    $("f-aprox-via").value = deal.aprox_via || "";
    $("f-propuesta").checked = !!deal.st_propuesta;
    $("f-propuesta-desc").value = deal.propuesta_desc || "";
    $("f-value").value = deal.value || "";
    $("f-notes").value = deal.notes || "";
    $("deleteBtn").hidden = !deal.id;
    // Zona: el admin siempre elige. El comercial la hereda de su perfil, salvo
    // que no tenga ninguna asignada: entonces la elige él, o se queda atrapado
    // en "Sin zona" para siempre (solo un admin puede asignarla en Usuarios).
    const isAdmin = PROFILE && PROFILE.role === "admin";
    const sinZona = !(PROFILE && PROFILE.zona);
    $("f-zona").disabled = !(isAdmin || sinZona);
    if ($("zonaHint")) {
      $("zonaHint").textContent = isAdmin
        ? "Como admin puedes elegirla."
        : sinZona
          ? "No tienes zona asignada, elígela para esta marca. Pídele a un admin que te asigne la tuya."
          : "Se hereda de tu zona asignada (" + PROFILE.zona + ").";
    }
    showFormError("");
    syncFases();
    gotoStep(1);

    // ¿Quién la registró y cuándo? + panel de comentarios (SOLO en marcas ya guardadas:
    // al registrar no tiene sentido comentar algo que todavía no existe)
    if (deal.id) {
      const reg = deal.source === "web" ? "Formulario web" : (deal.owner_name || "—");
      $("dealMetaInfo").textContent = "Registrada por " + reg + (deal.created_at ? " · " + fdate(deal.created_at) : "");
      $("detailRight").hidden = false;
      $("detailGrid").classList.add("two");
      loadComments(deal.id);
    } else {
      $("dealMetaInfo").textContent = "";
      $("detailRight").hidden = true;
      $("detailGrid").classList.remove("two");
      $("commentsList").innerHTML = "";
      CURRENT_DEAL = null;
    }
    $("modalOverlay").hidden = false;
    setTimeout(() => $("f-brand").focus(), 60);
  }

  // Navegación del asistente
  $("nextBtn").addEventListener("click", () => {
    if (STEP === 1 && !$("f-brand").value.trim()) { showFormError("Ponle nombre a la marca para continuar.", "f-brand"); return; }
    showFormError(""); gotoStep(STEP + 1);
  });
  $("backBtn").addEventListener("click", () => { showFormError(""); gotoStep(STEP - 1); });
  document.querySelectorAll(".wiz-step").forEach((b) => b.addEventListener("click", () => {
    const target = Number(b.dataset.step);
    if (target > 1 && !$("f-brand").value.trim()) { showFormError("Ponle nombre a la marca para continuar.", "f-brand"); return; }
    showFormError(""); gotoStep(target);
  }));

  ["f-brand", "f-contact", "f-cargo", "f-email"].forEach((id) => $(id).addEventListener("input", () => {
    $(id).classList.remove("invalid"); updateProspStatus();
  }));
  $("f-aproximacion").addEventListener("change", syncFases);
  $("f-propuesta").addEventListener("change", syncFases);

  /* ---------- Comentarios / actividad ---------- */
  let CURRENT_DEAL = null;
  async function loadComments(dealId) {
    CURRENT_DEAL = dealId;
    const box = $("commentsList");
    box.innerHTML = `<div class="comment-empty">Cargando...</div>`;
    const { data, error } = await sb.from("deal_comments").select("*").eq("deal_id", dealId).order("created_at", { ascending: true });
    if (error) { box.innerHTML = `<div class="comment-empty">${esc(error.message)}</div>`; return; }
    if (!data || !data.length) { box.innerHTML = `<div class="comment-empty">Aún no hay comentarios. ¡Sé el primero!</div>`; return; }
    box.innerHTML = data.map((c) => {
      const mine = (PROFILE && c.author === PROFILE.id);
      const del = (mine || (PROFILE && PROFILE.role === "admin")) ? `<button class="comment-del" data-cid="${c.id}">Eliminar</button>` : "";
      return `<div class="comment">
        <div class="comment-head"><span class="comment-author">${esc(c.author_name || "—")}</span><span class="comment-time">${fdatetime(c.created_at)} ${del}</span></div>
        <div class="comment-body">${esc(c.body)}</div>
      </div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
    box.querySelectorAll(".comment-del").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("¿Eliminar comentario?")) return;
      const { error } = await sb.from("deal_comments").delete().eq("id", b.dataset.cid);
      if (error) toast("Error: " + error.message, true); else loadComments(CURRENT_DEAL);
    }));
  }

  $("addCommentBtn").addEventListener("click", async () => {
    const body = $("commentInput").value.trim();
    if (!body || !CURRENT_DEAL) return;
    const { error } = await sb.from("deal_comments").insert([{ deal_id: CURRENT_DEAL, body, author_name: PROFILE ? PROFILE.name : "" }]);
    if (error) { toast("Error: " + error.message, true); return; }
    $("commentInput").value = "";
    loadComments(CURRENT_DEAL);
  });
  function closeModal() { $("modalOverlay").hidden = true; }
  $("addBtn").addEventListener("click", () => openModal(null));
  $("modalClose").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modalOverlay").hidden) closeModal(); });
  $("modalOverlay").addEventListener("click", (e) => { if (e.target === $("modalOverlay")) closeModal(); });

  // Logo: pegar URL o subir archivo
  $("logoUrl").addEventListener("input", () => setLogoPreview($("logoUrl").value.trim()));
  $("logoFile").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    toast("Subiendo logo...");
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `logos/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await sb.storage.from("media").upload(path, file, { cacheControl: "3600" });
      if (error) throw error;
      const { data } = sb.storage.from("media").getPublicUrl(path);
      setLogoPreview(data.publicUrl); toast("Logo listo ✔");
    } catch (err) { toast("Error al subir: " + (err.message || err), true); }
  });

  $("dealForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("dealId").value;
    const aproxOn = $("f-aproximacion").checked;
    const aproxVia = $("f-aprox-via").value;
    const propOn = $("f-propuesta").checked;
    const propDesc = $("f-propuesta-desc").value.trim();
    showFormError("");
    // Reglas del cliente: la marca lleva nombre; aproximación lleva vía; propuesta lleva descripción
    if (!$("f-brand").value.trim()) { showFormError("Ponle nombre a la marca.", "f-brand"); return; }
    if (aproxOn && !aproxVia) { showFormError("Indica la vía de la aproximación (Conocido / WhatsApp).", "f-aprox-via"); return; }
    if (propOn && !propDesc) { showFormError("Para marcar Propuesta describe qué se le envió a la marca.", "f-propuesta-desc"); return; }
    const payload = {
      brand: $("f-brand").value.trim(),
      logo: $("f-logo").value.trim(),
      contact: $("f-contact").value.trim(),
      cargo: $("f-cargo").value.trim(),
      email: $("f-email").value.trim(),
      phone: $("f-phone").value.trim(),
      prospeccion_via: $("f-prosp-via").value,
      st_aproximacion: aproxOn,
      aprox_via: aproxVia,
      st_propuesta: propOn,
      propuesta_desc: propDesc,
      value: propOn ? (parseFloat($("f-value").value) || 0) : 0,
      notes: $("f-notes").value.trim(),
      updated_at: new Date().toISOString()
    };
    // Prospección = datos obligatorios completos (se guarda calculada)
    payload.st_prospeccion = !!(payload.brand && payload.contact && payload.cargo && payload.email && payload.logo);
    // Zona: la elige quien tiene el select habilitado (admin, o comercial sin
    // zona propia); el resto hereda la suya. Debe ir en el mismo orden que openModal.
    if (PROFILE && (PROFILE.role === "admin" || !PROFILE.zona)) payload.zona = $("f-zona").value;
    else if (!id) payload.zona = (PROFILE && PROFILE.zona) || "";
    else {
      const deal = DEALS.find((d) => d.id === id);
      if (deal && !deal.zona && PROFILE && PROFILE.zona) payload.zona = PROFILE.zona; // completa marcas viejas sin zona
    }
    // Adopción: si el lead entró por la web (sin dueño), al editarlo queda a
    // nombre de quien lo trabaja. Si no, la policy lo dejaría huérfano para siempre.
    if (id && PROFILE) {
      const deal = DEALS.find((d) => d.id === id);
      if (deal && !deal.owner) { payload.owner = PROFILE.id; payload.owner_name = PROFILE.name || ""; }
    }
    let error, data;
    if (id) ({ data, error } = await sb.from("deals").update(payload).eq("id", id).select("id"));
    else {
      payload.owner_name = PROFILE ? PROFILE.name : "";
      ({ data, error } = await sb.from("deals").insert([payload]).select("id"));
    }
    if (error) { showFormError(explainError(error, "No se pudo guardar la marca")); return; }
    if (!data || !data.length) { showFormError(RLS_MSG); return; }  // RLS la filtró: no se guardó
    closeModal(); toast("Guardado ✔"); load();
  });

  $("deleteBtn").addEventListener("click", async () => {
    const id = $("dealId").value;
    if (!id || !confirm("¿Eliminar esta oportunidad?")) return;
    const { data, error } = await sb.from("deals").delete().eq("id", id).select("id");
    if (error) { showFormError(explainError(error, "No se pudo eliminar")); return; }
    if (!data || !data.length) { showFormError(RLS_MSG); return; }  // RLS la filtró: no se borró
    closeModal(); toast("Eliminada ✔"); load();
  });

  /* ---------- Toast ---------- */
  let tT;
  function toast(msg, err) {
    const el = $("toast"); el.textContent = msg; el.className = "save-toast show" + (err ? " err" : "");
    clearTimeout(tT); tT = setTimeout(() => { el.className = "save-toast"; }, 2600);
  }

  boot();
})();
