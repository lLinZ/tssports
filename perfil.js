/* =====================================================================
   MI PERFIL — cualquier usuario edita sus propios datos.
   Nombre, correo de login y contraseña van por la Edge Function
   "update-user" (necesita service_role para tocar el correo de auth).
   El rol y la zona son de solo lectura: los gestiona un admin.
   ===================================================================== */
(function () {
  const CFG = window.TS_SUPABASE || {};
  const HAS_CLOUD = !!(CFG.url && CFG.anonKey && window.supabase);
  const sb = HAS_CLOUD ? window.supabase.createClient(CFG.url, CFG.anonKey) : null;

  const $ = (id) => document.getElementById(id);
  const roleLabel = (r) => r === "admin" ? "Admin" : r === "vendedor" ? "Vendedor" : "Comercial";

  let PROFILE = null;

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
    if (!HAS_CLOUD) { $("loginMode").textContent = "Supabase no está configurado (config.js)."; showLogin(); return; }
    $("loginMode").textContent = "Usa el mismo email y contraseña del CRM.";
    const { data } = await sb.auth.getSession();
    if (data && data.session) showApp(); else showLogin();
  }
  function showLogin() { $("profileApp").hidden = true; $("loginScreen").style.display = "grid"; }
  async function showApp() {
    $("loginScreen").style.display = "none"; $("profileApp").hidden = false;
    await loadProfile();
  }

  async function loadProfile() {
    const { data: s } = await sb.auth.getSession();
    const user = s && s.session && s.session.user;
    if (!user) { showLogin(); return; }
    const { data } = await sb.from("profiles").select("id,name,email,role,zona").eq("id", user.id).maybeSingle();
    PROFILE = data || { id: user.id, name: (user.email || "").split("@")[0], email: user.email, role: "comercial", zona: "" };

    const tag = $("userTag");
    tag.textContent = "● " + (PROFILE.name || user.email) + " · " + roleLabel(PROFILE.role) + (PROFILE.zona ? " · " + PROFILE.zona : "");
    tag.className = "admin-mode-tag" + (PROFILE.role === "admin" ? " cloud" : "");

    $("pf-name").value = PROFILE.name || "";
    $("pf-email").value = PROFILE.email || user.email || "";
    $("pf-role").value = roleLabel(PROFILE.role);
    $("pf-zona").value = PROFILE.zona || "Sin zona";
    $("pf-pass").value = "";
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginStatus").textContent = "";
    try {
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

  /* ---------- Guardar mis datos ---------- */
  $("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = $("profileStatus");
    const pass = $("pf-pass").value;
    if (pass && pass.length < 6) { st.className = "form-status err"; st.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
    const nuevoEmail = $("pf-email").value.trim().toLowerCase();
    const cambiaEmail = PROFILE && nuevoEmail !== (PROFILE.email || "").toLowerCase();
    const body = {
      id: PROFILE.id,               // solo puedo editarme a mí mismo (lo valida la función)
      name: $("pf-name").value.trim(),
      email: nuevoEmail,
    };
    if (pass) body.password = pass;
    st.className = "form-status"; st.textContent = "Guardando...";
    $("pf-save").disabled = true;
    try {
      const { data, error } = await sb.functions.invoke("update-user", { body });
      if (error) throw new Error(await readFnError(error));
      if (data && data.error) throw new Error(data.error);
      st.className = "form-status ok";
      st.textContent = cambiaEmail
        ? "✔ Datos guardados. Tu correo de inicio de sesión ahora es " + nuevoEmail + "."
        : "✔ Datos guardados.";
      $("pf-pass").value = "";
      await loadProfile();
    } catch (err) {
      st.className = "form-status err"; st.textContent = "Error: " + (err.message || err);
    } finally { $("pf-save").disabled = false; }
  });

  /* ---------- Toast ---------- */
  let tT;
  function toast(msg, err) {
    const el = $("toast"); el.textContent = msg; el.className = "save-toast show" + (err ? " err" : "");
    clearTimeout(tT); tT = setTimeout(() => { el.className = "save-toast"; }, 2600);
  }

  boot();
})();
