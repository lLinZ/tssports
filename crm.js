/* =====================================================================
   CRM de Patrocinios — tablero Kanban sobre Supabase.
   Reutiliza config.js (mismas claves del proyecto).
   ===================================================================== */
(function () {
  const CFG = window.TS_SUPABASE || {};
  const HAS_CLOUD = !!(CFG.url && CFG.anonKey && window.supabase);
  const sb = HAS_CLOUD ? window.supabase.createClient(CFG.url, CFG.anonKey) : null;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = (n) => "$" + (Number(n) || 0).toLocaleString("en-US");

  const STAGES = [
    { key: "nuevo", label: "Nuevo", color: "#6b7280" },
    { key: "contactado", label: "Contactado", color: "#3b82f6" },
    { key: "propuesta", label: "Propuesta", color: "#8b5cf6" },
    { key: "negociacion", label: "Negociación", color: "#f59e0b" },
    { key: "ganado", label: "Ganado", color: "#16c79a" },
    { key: "perdido", label: "Perdido", color: "#ef4444" }
  ];

  let DEALS = [];
  let PROFILE = null; // { id, name, role }

  /* ---------- Auth ---------- */
  async function boot() {
    if (!HAS_CLOUD) {
      $("loginMode").textContent = "Supabase no está configurado (config.js). El CRM necesita la nube para funcionar.";
      return;
    }
    $("loginMode").textContent = "Conectado a Supabase. Usa el mismo email y contraseña del panel.";
    const { data } = await sb.auth.getUser();
    if (data && data.user) showApp(); else showLogin();
  }
  function showLogin() { $("crmApp").hidden = true; $("loginScreen").style.display = "grid"; }
  async function showApp() {
    $("loginScreen").style.display = "none"; $("crmApp").hidden = false;
    await loadProfile();
    await load();
  }

  // Carga el perfil (rol + nombre) del usuario logueado
  async function loadProfile() {
    const { data: u } = await sb.auth.getUser();
    const user = u && u.user;
    if (!user) return;
    let prof = null;
    const { data } = await sb.from("profiles").select("id,name,role").eq("id", user.id).maybeSingle();
    prof = data;
    if (!prof) { // por si el trigger aún no creó el perfil
      const name = (user.email || "").split("@")[0];
      await sb.from("profiles").upsert({ id: user.id, email: user.email, name }).select();
      prof = { id: user.id, name, role: "comercial" };
    }
    PROFILE = prof;
    const tag = $("userTag");
    if (tag) {
      const rol = prof.role === "admin" ? "Admin" : "Comercial";
      tag.textContent = "● " + (prof.name || user.email) + " · " + rol;
      tag.className = "admin-mode-tag" + (prof.role === "admin" ? " cloud" : "");
    }
    // El enlace a la vista de usuarios solo lo ve el admin
    if ($("usersBtn")) $("usersBtn").style.display = (prof.role === "admin") ? "" : "none";
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginStatus").textContent = "";
    try {
      const { error } = await sb.auth.signInWithPassword({ email: $("loginEmail").value.trim(), password: $("loginPass").value });
      if (error) throw error;
      await showApp();
    } catch (err) { $("loginStatus").textContent = "No se pudo iniciar sesión: " + (err.message || err); }
  });
  $("logoutBtn").addEventListener("click", async () => { await sb.auth.signOut(); showLogin(); });
  $("refreshBtn").addEventListener("click", load);

  /* ---------- Datos ---------- */
  async function load() {
    const { data, error } = await sb.from("deals").select("*").order("created_at", { ascending: false });
    if (error) { toast("Error al cargar: " + error.message, true); return; }
    DEALS = data || [];
    render();
  }

  /* ---------- Avance ---------- */
  const CHECK = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  function avanceKey(d) {
    if (d.st_aproximacion && d.st_prospeccion && d.st_propuesta) return "completa";
    if (d.st_propuesta) return "propuesta";
    if (d.st_prospeccion) return "prospeccion";
    if (d.st_aproximacion) return "aproximacion";
    return "sin";
  }

  /* ---------- Render ---------- */
  function render() {
    const totalVal = DEALS.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const completas = DEALS.filter((d) => avanceKey(d) === "completa").length;
    $("crmStats").innerHTML =
      `<div class="crm-stat"><div class="cs-num">${DEALS.length}</div><div class="cs-label">Marcas</div></div>
       <div class="crm-stat pipe"><div class="cs-num">${money(totalVal)}</div><div class="cs-label">Valor total / año</div></div>
       <div class="crm-stat win"><div class="cs-num">${completas}</div><div class="cs-label">Completadas</div></div>`;
    renderGrid();
  }

  function renderGrid() {
    const q = ($("fSearch").value || "").toLowerCase().trim();
    const av = $("fAvance").value;
    const sort = $("fSort").value;
    let items = DEALS.slice();
    if (q) items = items.filter((d) => (d.brand || "").toLowerCase().includes(q) || (d.contact || "").toLowerCase().includes(q));
    if (av) items = items.filter((d) => avanceKey(d) === av);
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
    const stage = (key, label) => {
      const on = !!d["st_" + key];
      return `<span class="bs-item ${on ? "done" : ""}" data-toggle="${key}"><span class="bs-dot">${on ? CHECK : ""}</span>${label}</span>`;
    };
    const src = d.source === "web" ? `<span class="deal-source">Web</span>` : "";
    const owner = (PROFILE && PROFILE.role === "admin" && d.owner_name)
      ? `<span class="brand-owner"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(d.owner_name)}</span>` : "";
    return `<article class="brand-card" data-id="${d.id}">
      ${src}
      <div class="brand-logo">${logo}</div>
      <div class="brand-name">${esc(d.brand) || "(sin nombre)"}</div>
      <div class="brand-stages">
        ${stage("aproximacion", "Aproximación")}
        ${stage("prospeccion", "Prospección")}
        ${stage("propuesta", "Propuesta")}
      </div>
      <div class="brand-foot">
        <span class="brand-value">${d.value ? money(d.value) + " /año" : "—"}</span>
        ${owner}
      </div>
    </article>`;
  }

  // Interacción de la cuadrícula (delegación)
  $("crmBoard").addEventListener("click", async (e) => {
    const toggle = e.target.closest(".bs-item");
    const card = e.target.closest(".brand-card");
    if (!card) return;
    const deal = DEALS.find((d) => d.id === card.dataset.id);
    if (!deal) return;
    if (toggle) { // marcar/desmarcar etapa sin abrir el modal
      e.stopPropagation();
      const key = "st_" + toggle.dataset.toggle;
      deal[key] = !deal[key];
      renderGrid();
      const upd = {}; upd[key] = deal[key]; upd.updated_at = new Date().toISOString();
      const { error } = await sb.from("deals").update(upd).eq("id", deal.id);
      if (error) { toast("Error: " + error.message, true); load(); } else { render(); }
      return;
    }
    openModal(deal);
  });
  $("fSearch").addEventListener("input", renderGrid);
  $("fAvance").addEventListener("change", renderGrid);
  $("fSort").addEventListener("change", renderGrid);

  /* ---------- Modal ---------- */
  function setLogoPreview(url) {
    $("f-logo").value = url || "";
    $("logoPrev").innerHTML = url ? `<img src="${esc(url)}" alt="logo" />` : "Sin logo";
    $("logoUrl").value = url || "";
  }
  function openModal(deal) {
    deal = deal || {};
    $("modalTitle").textContent = deal.id ? "Editar marca" : "Nueva marca";
    $("dealId").value = deal.id || "";
    setLogoPreview(deal.logo || "");
    $("f-brand").value = deal.brand || "";
    $("f-value").value = deal.value || "";
    $("f-st1").checked = !!deal.st_aproximacion;
    $("f-st2").checked = !!deal.st_prospeccion;
    $("f-st3").checked = !!deal.st_propuesta;
    $("f-contact").value = deal.contact || "";
    $("f-email").value = deal.email || "";
    $("f-phone").value = deal.phone || "";
    $("f-notes").value = deal.notes || "";
    $("deleteBtn").style.display = deal.id ? "" : "none";
    $("modalOverlay").hidden = false;
  }
  function closeModal() { $("modalOverlay").hidden = true; }
  $("addBtn").addEventListener("click", () => openModal(null));
  $("cancelBtn").addEventListener("click", closeModal);
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
    const payload = {
      brand: $("f-brand").value.trim(),
      logo: $("f-logo").value.trim(),
      value: parseFloat($("f-value").value) || 0,
      st_aproximacion: $("f-st1").checked,
      st_prospeccion: $("f-st2").checked,
      st_propuesta: $("f-st3").checked,
      contact: $("f-contact").value.trim(),
      email: $("f-email").value.trim(),
      phone: $("f-phone").value.trim(),
      notes: $("f-notes").value.trim(),
      updated_at: new Date().toISOString()
    };
    let error;
    if (id) ({ error } = await sb.from("deals").update(payload).eq("id", id));
    else { payload.owner_name = PROFILE ? PROFILE.name : ""; ({ error } = await sb.from("deals").insert([payload])); }
    if (error) { toast("Error al guardar: " + error.message, true); return; }
    closeModal(); toast("Guardado ✔"); load();
  });

  $("deleteBtn").addEventListener("click", async () => {
    const id = $("dealId").value;
    if (!id || !confirm("¿Eliminar esta oportunidad?")) return;
    const { error } = await sb.from("deals").delete().eq("id", id);
    if (error) { toast("Error: " + error.message, true); return; }
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
