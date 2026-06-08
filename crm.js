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
  async function showApp() { $("loginScreen").style.display = "none"; $("crmApp").hidden = false; await load(); }

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

  /* ---------- Render ---------- */
  function render() {
    // Métricas
    const open = DEALS.filter((d) => d.stage !== "ganado" && d.stage !== "perdido");
    const pipeline = open.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const won = DEALS.filter((d) => d.stage === "ganado").reduce((s, d) => s + (Number(d.value) || 0), 0);
    $("crmStats").innerHTML =
      `<div class="crm-stat"><div class="cs-num">${DEALS.length}</div><div class="cs-label">Oportunidades</div></div>
       <div class="crm-stat pipe"><div class="cs-num">${money(pipeline)}</div><div class="cs-label">En pipeline</div></div>
       <div class="crm-stat win"><div class="cs-num">${money(won)}</div><div class="cs-label">Ganado</div></div>`;

    // Columnas
    $("crmBoard").innerHTML = STAGES.map((st) => {
      const items = DEALS.filter((d) => d.stage === st.key);
      const sum = items.reduce((s, d) => s + (Number(d.value) || 0), 0);
      const cards = items.length
        ? items.map(cardHtml).join("")
        : `<div class="deal-empty">Sin oportunidades</div>`;
      return `<div class="crm-col" data-stage="${st.key}">
        <div class="crm-col-head">
          <h3><span class="crm-col-dot" style="background:${st.color}"></span>${st.label}</h3>
          <span class="crm-col-count">${items.length}</span>
        </div>
        <div class="crm-col-sum">${money(sum)}</div>
        ${cards}
      </div>`;
    }).join("");

    bindDnD();
  }

  function cardHtml(d) {
    const src = d.source === "web" ? `<span class="deal-source">Web</span>` : "";
    return `<div class="deal-card" draggable="true" data-id="${d.id}">
      <div class="deal-brand">${esc(d.brand) || "(sin nombre)"}</div>
      ${d.contact ? `<div class="deal-contact">${esc(d.contact)}</div>` : ""}
      <div class="deal-meta">
        <span class="deal-value">${d.value ? money(d.value) : "—"}</span>
        ${src}
      </div>
    </div>`;
  }

  /* ---------- Drag & Drop ---------- */
  let draggingId = null;
  function bindDnD() {
    document.querySelectorAll(".deal-card").forEach((card) => {
      card.addEventListener("dragstart", () => { draggingId = card.dataset.id; card.classList.add("dragging"); });
      card.addEventListener("dragend", () => { card.classList.remove("dragging"); draggingId = null; });
      card.addEventListener("click", () => openModal(DEALS.find((d) => d.id === card.dataset.id)));
    });
    document.querySelectorAll(".crm-col").forEach((col) => {
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drop-hover"); });
      col.addEventListener("dragleave", () => col.classList.remove("drop-hover"));
      col.addEventListener("drop", async (e) => {
        e.preventDefault(); col.classList.remove("drop-hover");
        const id = draggingId; const stage = col.dataset.stage;
        if (!id) return;
        const deal = DEALS.find((d) => d.id === id);
        if (!deal || deal.stage === stage) return;
        deal.stage = stage; render(); // optimista
        const { error } = await sb.from("deals").update({ stage, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) { toast("Error: " + error.message, true); load(); }
      });
    });
  }

  /* ---------- Modal ---------- */
  function openModal(deal) {
    deal = deal || {};
    $("modalTitle").textContent = deal.id ? "Editar oportunidad" : "Nueva oportunidad";
    $("dealId").value = deal.id || "";
    $("f-brand").value = deal.brand || "";
    $("f-value").value = deal.value || "";
    $("f-contact").value = deal.contact || "";
    $("f-stage").value = deal.stage || "nuevo";
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

  $("dealForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("dealId").value;
    const payload = {
      brand: $("f-brand").value.trim(),
      value: parseFloat($("f-value").value) || 0,
      contact: $("f-contact").value.trim(),
      stage: $("f-stage").value,
      email: $("f-email").value.trim(),
      phone: $("f-phone").value.trim(),
      notes: $("f-notes").value.trim(),
      updated_at: new Date().toISOString()
    };
    let error;
    if (id) ({ error } = await sb.from("deals").update(payload).eq("id", id));
    else ({ error } = await sb.from("deals").insert([payload]));
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
