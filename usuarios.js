/* =====================================================================
   USUARIOS — Vista dedicada para gestionar comerciales (solo admin).
   ===================================================================== */
(function () {
  const CFG = window.TS_SUPABASE || {};
  const HAS_CLOUD = !!(CFG.url && CFG.anonKey && window.supabase);
  const sb = HAS_CLOUD ? window.supabase.createClient(CFG.url, CFG.anonKey) : null;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fdate = (s) => { try { return new Date(s).toLocaleDateString("es"); } catch (e) { return ""; } };

  let PROFILE = null;
  let USERS = [];   // usuarios cargados, para poblar el modal de edición

  // Zonas de los prospectores comerciales (una por usuario)
  const ZONAS = ["Caracas", "Centro", "Lara", "Andes-Zulia", "Oriente"];
  const zonaOptions = (sel) => `<option value=""${!sel ? " selected" : ""}>Sin zona</option>` +
    ZONAS.map((z) => `<option value="${z}"${z === sel ? " selected" : ""}>${z}</option>`).join("");
  const roleLabel = (r) => r === "admin" ? "Admin" : r === "vendedor" ? "Vendedor" : "Comercial";

  // Traduce el error de una Edge Function (incluye el caso "aún no desplegada")
  async function readFnError(error) {
    try {
      if (error && error.context && typeof error.context.json === "function") {
        const j = await error.context.json();
        if (j && j.error) return j.error;
      }
    } catch (_) { /* noop */ }
    const m = (error && error.message) || String(error);
    if (/not found|404|failed to send|failed to fetch/i.test(m))
      return "La función 'update-user' no está desplegada todavía en Supabase. Despliégala (carpeta supabase/functions/update-user) y vuelve a intentar.";
    return m;
  }

  /* ---------- Auth ---------- */
  async function boot() {
    if (!HAS_CLOUD) { $("loginMode").textContent = "Supabase no está configurado (config.js)."; return; }
    $("loginMode").textContent = "Usa el email y la contraseña de administrador.";
    // getSession() lee la sesión local (sin llamada al servidor): evita el parpadeo del login.
    const { data } = await sb.auth.getSession();
    if (data && data.session) showApp(); else showLogin();
  }
  function showLogin() { $("usersApp").hidden = true; $("loginScreen").style.display = "grid"; }
  async function showApp() {
    $("loginScreen").style.display = "none"; $("usersApp").hidden = false;
    await loadProfile();
  }

  async function loadProfile() {
    const { data: u } = await sb.auth.getSession();
    const user = u && u.session && u.session.user;
    if (!user) return;
    const { data } = await sb.from("profiles").select("id,name,role").eq("id", user.id).maybeSingle();
    PROFILE = data || { id: user.id, name: (user.email || "").split("@")[0], role: "comercial" };
    const tag = $("userTag");
    const rol = PROFILE.role === "admin" ? "Admin" : PROFILE.role === "vendedor" ? "Vendedor" : "Comercial";
    tag.textContent = "● " + (PROFILE.name || user.email) + " · " + rol;
    tag.className = "admin-mode-tag" + (PROFILE.role === "admin" ? " cloud" : "");

    if (PROFILE.role === "admin") {
      $("adminContent").hidden = false; $("notAdmin").hidden = true;
      loadUsers();
    } else {
      $("adminContent").hidden = true; $("notAdmin").hidden = false;
    }
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginStatus").textContent = "";
    try {
      const { error } = await sb.auth.signInWithPassword({ email: $("loginEmail").value.trim().toLowerCase(), password: $("loginPass").value });
      if (error) throw error;
      await showApp();
    } catch (err) { $("loginStatus").textContent = "No se pudo iniciar sesión: " + (err.message || err); }
  });
  $("logoutBtn").addEventListener("click", async () => { await sb.auth.signOut(); showLogin(); });
  $("refreshBtn").addEventListener("click", loadUsers);

  /* ---------- Lista de usuarios ---------- */
  async function loadUsers() {
    const tb = $("usersTbody");
    const { data, error } = await sb.from("profiles").select("id,email,name,role,zona,created_at").order("created_at", { ascending: true });
    if (error) { tb.innerHTML = `<tr><td colspan="6">${esc(error.message)}</td></tr>`; return; }
    USERS = data || [];
    tb.innerHTML = USERS.map((p) => {
      const you = (PROFILE && p.id === PROFILE.id) ? `<span class="user-you">(tú)</span>` : "";
      return `<tr>
        <td><strong>${esc(p.name || "—")}</strong>${you}</td>
        <td>${esc(p.email)}</td>
        <td>${esc(roleLabel(p.role))}</td>
        <td>${esc(p.zona || "—")}</td>
        <td>${fdate(p.created_at)}</td>
        <td style="text-align:right"><button class="btn btn-ghost btn-sm u-edit" data-uid="${p.id}">Editar</button></td>
      </tr>`;
    }).join("");
    tb.querySelectorAll(".u-edit").forEach((b) => b.addEventListener("click", () => openEdit(b.dataset.uid)));
  }

  /* ---------- Modal: editar usuario ---------- */
  function openEdit(uid) {
    const p = USERS.find((u) => u.id === uid);
    if (!p) return;
    $("eu-id").value = p.id;
    $("eu-name").value = p.name || "";
    $("eu-email").value = p.email || "";
    $("eu-role").value = p.role || "comercial";
    $("eu-zona").innerHTML = zonaOptions(p.zona || "");
    $("eu-pass").value = "";
    $("editStatus").className = "form-status"; $("editStatus").textContent = "";
    $("editOverlay").hidden = false;
  }
  function closeEdit() { $("editOverlay").hidden = true; }
  $("editClose").addEventListener("click", closeEdit);
  $("editCancel").addEventListener("click", closeEdit);
  $("editOverlay").addEventListener("click", (e) => { if (e.target === $("editOverlay")) closeEdit(); });

  $("editUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = $("editStatus");
    const pass = $("eu-pass").value;
    if (pass && pass.length < 6) { st.className = "form-status err"; st.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
    const body = {
      id: $("eu-id").value,
      name: $("eu-name").value.trim(),
      email: $("eu-email").value.trim().toLowerCase(),
      role: $("eu-role").value,
      zona: $("eu-zona").value,
    };
    if (pass) body.password = pass;
    st.className = "form-status"; st.textContent = "Guardando...";
    $("editSave").disabled = true;
    try {
      const { data, error } = await sb.functions.invoke("update-user", { body });
      if (error) throw new Error(await readFnError(error));
      if (data && data.error) throw new Error(data.error);
      closeEdit();
      toast("Usuario actualizado ✔");
      await loadUsers();
    } catch (err) {
      st.className = "form-status err"; st.textContent = "Error: " + (err.message || err);
    } finally { $("editSave").disabled = false; }
  });

  /* ---------- Crear usuario ---------- */
  $("newUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    // El email se guarda en minúsculas para que el login nunca falle por mayúsculas
    const name = $("nu-name").value.trim(), email = $("nu-email").value.trim().toLowerCase();
    const pass = $("nu-pass").value, role = $("nu-role").value, zona = $("nu-zona").value;
    const st = $("newUserStatus");
    st.className = "form-status"; st.textContent = "Creando usuario...";
    try {
      const tmp = window.supabase.createClient(CFG.url, CFG.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, storageKey: "ts_tmp_signup" }
      });
      const { data, error } = await tmp.auth.signUp({ email, password: pass, options: { data: { name } } });
      if (error) throw error;
      if (data.user) { // el trigger ya creó el perfil; le ponemos rol y zona
        await sb.from("profiles").update({ role, name, zona }).eq("id", data.user.id);
      }
      st.className = "form-status ok";
      st.textContent = "✔ Usuario creado: " + email + " (entrégale esta contraseña al comercial)";
      $("newUserForm").reset();
      await loadUsers();
    } catch (err) {
      st.className = "form-status err";
      st.textContent = "Error: " + (err.message || err);
    }
  });

  /* ---------- Toast ---------- */
  let tT;
  function toast(msg, err) {
    const el = $("toast"); el.textContent = msg; el.className = "save-toast show" + (err ? " err" : "");
    clearTimeout(tT); tT = setTimeout(() => { el.className = "save-toast"; }, 2600);
  }

  boot();
})();
