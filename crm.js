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
  const fdate = (s) => { try { return new Date(s).toLocaleDateString("es"); } catch (e) { return ""; } };
  const fdatetime = (s) => { try { return new Date(s).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };

  /* ▼▼▼ ETAPAS DEL PIPELINE — provisional. Cuando me pases la lista definitiva,
     solo edita este arreglo (key sin espacios/acentos, label es lo que se ve).
     STAGE_WON = la etapa que cuenta como "ganada" en las métricas. ▼▼▼ */
  const STAGES = [
    { key: "nuevo",        label: "Nuevo",        color: "#6b7280" },
    { key: "aproximacion", label: "Aproximación", color: "#3b82f6" },
    { key: "seguimiento",  label: "Seguimiento",  color: "#0ea5e9" },
    { key: "propuesta",    label: "Propuesta",    color: "#8b5cf6" },
    { key: "negociacion",  label: "Negociación",  color: "#f59e0b" },
    { key: "ganado",       label: "Ganado",       color: "#16c79a" },
    { key: "perdido",      label: "Perdido",      color: "#ef4444" }
  ];
  const STAGE_WON = "ganado";
  /* ▲▲▲ ▲▲▲ */
  const stageMeta = (key) => STAGES.find((s) => s.key === key) || STAGES[0];
  const stageOptions = (sel) => STAGES.map((s) => `<option value="${s.key}"${s.key === sel ? " selected" : ""}>${esc(s.label)}</option>`).join("");

  let DEALS = [];
  let DEAL_QUOTE_TOTALS = {}; // deal_id -> suma de cotizaciones
  let PROFILE = null; // { id, name, role }

  /* ---------- Auth ---------- */
  async function boot() {
    // Llenamos los desplegables de etapa antes de pintar nada
    $("f-stage").innerHTML = stageOptions("nuevo");
    $("fStage").innerHTML = `<option value="">Todos los estatus</option>` + stageOptions(null);

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

  // Carga el perfil (rol + nombre) del usuario logueado
  async function loadProfile() {
    const { data: s } = await sb.auth.getSession();
    const user = s && s.session && s.session.user;
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

    // El admin puede filtrar por agente: cargamos la lista
    if (prof.role === "admin") {
      const { data } = await sb.from("profiles").select("id,name,email").order("name");
      const sel = $("fAgent");
      if (sel && data) {
        sel.innerHTML = `<option value="">Todos los agentes</option>` +
          data.map((p) => `<option value="${p.id}">${esc(p.name || p.email)}</option>`).join("");
        sel.style.display = "";
      }
    }
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
    const [deals, quotes] = await Promise.all([
      sb.from("deals").select("*").order("created_at", { ascending: false }),
      sb.from("deal_quotes").select("deal_id, amount")
    ]);
    if (deals.error) { toast("Error al cargar: " + deals.error.message, true); return; }
    DEALS = deals.data || [];
    DEAL_QUOTE_TOTALS = {};
    if (!quotes.error) (quotes.data || []).forEach((q) => {
      DEAL_QUOTE_TOTALS[q.deal_id] = (DEAL_QUOTE_TOTALS[q.deal_id] || 0) + (Number(q.amount) || 0);
    });
    render();
  }

  const dealStage = (d) => (d.stage && STAGES.some((s) => s.key === d.stage)) ? d.stage : "nuevo";

  /* ---------- Render ---------- */
  function render() {
    const totalVal = DEALS.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const totalQuoted = Object.values(DEAL_QUOTE_TOTALS).reduce((s, n) => s + n, 0);
    const ganadas = DEALS.filter((d) => dealStage(d) === STAGE_WON).length;
    $("crmStats").innerHTML =
      `<div class="crm-stat"><div class="cs-num">${DEALS.length}</div><div class="cs-label">Marcas</div></div>
       <div class="crm-stat pipe"><div class="cs-num">${money(totalVal)}</div><div class="cs-label">Valor total / año</div></div>
       <div class="crm-stat quote"><div class="cs-num">${money(totalQuoted)}</div><div class="cs-label">Total cotizado</div></div>
       <div class="crm-stat win"><div class="cs-num">${ganadas}</div><div class="cs-label">Ganadas</div></div>`;
    renderGrid();
  }

  function renderGrid() {
    const q = ($("fSearch").value || "").toLowerCase().trim();
    const st = $("fStage").value;
    const sort = $("fSort").value;
    const agent = $("fAgent") ? $("fAgent").value : "";
    let items = DEALS.slice();
    if (q) items = items.filter((d) => (d.brand || "").toLowerCase().includes(q) || (d.contact || "").toLowerCase().includes(q));
    if (st) items = items.filter((d) => dealStage(d) === st);
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
    const sm = stageMeta(dealStage(d));
    const src = d.source === "web" ? `<span class="deal-source">Web</span>` : "";
    const owner = (PROFILE && PROFILE.role === "admin" && d.owner_name)
      ? `<span class="brand-owner"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(d.owner_name)}</span>` : "";
    return `<article class="brand-card" data-id="${d.id}">
      ${src}
      <div class="brand-logo">${logo}</div>
      <div class="brand-name">${esc(d.brand) || "(sin nombre)"}</div>
      <div class="brand-stages">
        <span class="stage-pill" style="--st:${sm.color}">${esc(sm.label)}</span>
      </div>
      <div class="brand-foot">
        <span class="brand-value">${d.value ? money(d.value) + " /año" : "—"}</span>
        ${owner}
      </div>
    </article>`;
  }

  // Interacción de la cuadrícula (delegación)
  $("crmBoard").addEventListener("click", (e) => {
    const card = e.target.closest(".brand-card");
    if (!card) return;
    const deal = DEALS.find((d) => d.id === card.dataset.id);
    if (deal) openModal(deal);
  });
  $("fSearch").addEventListener("input", renderGrid);
  $("fStage").addEventListener("change", renderGrid);
  $("fSort").addEventListener("change", renderGrid);
  if ($("fAgent")) $("fAgent").addEventListener("change", renderGrid);

  /* ---------- Modal ---------- */
  function setLogoPreview(url) {
    $("f-logo").value = url || "";
    $("logoPrev").innerHTML = url ? `<img src="${esc(url)}" alt="logo" />` : "Sin logo";
    $("logoUrl").value = url || "";
  }
  function openModal(deal) {
    deal = deal || {};
    $("modalTitle").textContent = deal.id ? (deal.brand || "Editar marca") : "Nueva marca";
    $("dealId").value = deal.id || "";
    setLogoPreview(deal.logo || "");
    $("f-brand").value = deal.brand || "";
    $("f-value").value = deal.value || "";
    $("f-stage").value = dealStage(deal);
    $("f-contact").value = deal.contact || "";
    $("f-email").value = deal.email || "";
    $("f-phone").value = deal.phone || "";
    $("f-notes").value = deal.notes || "";
    $("deleteBtn").style.display = deal.id ? "" : "none";

    // ¿Quién la registró y cuándo? + panel de comentarios (solo si ya existe)
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
    }
    $("modalOverlay").hidden = false;
  }

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
  $("cancelBtn").addEventListener("click", closeModal);
  $("modalClose").addEventListener("click", closeModal);
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
      stage: $("f-stage").value,
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
