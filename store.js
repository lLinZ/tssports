/* =====================================================================
   STORE — Capa de datos del CRM.
   Decide de dónde leer/escribir el contenido:
     1. Supabase  (si config.js tiene url + anonKey)  → CRM real, para todos
     2. localStorage (si no hay Supabase)             → modo prueba local
   Siempre cae a TS_DEFAULTS si no hay nada guardado.

   Expone window.TS_STORE con:
     isCloud()                  -> bool (¿Supabase activo?)
     loadContent()              -> Promise<content>
     saveContent(content)       -> Promise<void>   (requiere sesión en la nube)
     uploadImage(file)          -> Promise<url>
     signIn(email, password)    -> Promise<user>
     signOut()                  -> Promise<void>
     getUser()                  -> Promise<user|null>
   ===================================================================== */
(function () {
  const CFG = window.TS_SUPABASE || {};
  const HAS_CLOUD = !!(CFG.url && CFG.anonKey && window.supabase);
  const LS_KEY = "ts_content";
  const ROW_ID = 1;          // guardamos todo en una sola fila
  const TABLE = "site_content";
  const BUCKET = "media";

  let sb = null;
  if (HAS_CLOUD) {
    sb = window.supabase.createClient(CFG.url, CFG.anonKey);
  }

  // Mezcla profunda: defaults <- guardado.
  // - Objetos: se combinan recursivamente (las claves nuevas del diseño se conservan).
  // - Arreglos: se combinan por índice (un elemento guardado hereda campos nuevos del default,
  //   p.ej. la foto de un proyecto que antes no existía).
  // - Hojas: un valor vacío ("") o ausente usa el valor por defecto.
  function merge(base, over) {
    if (over === undefined || over === null) return base;
    if (Array.isArray(base) && Array.isArray(over)) {
      return over.map((item, i) => merge(base[i], item));
    }
    if (base && typeof base === "object" && !Array.isArray(base) &&
        over && typeof over === "object" && !Array.isArray(over)) {
      const out = Object.assign({}, base);
      Object.keys(over).forEach((k) => { out[k] = merge(base[k], over[k]); });
      return out;
    }
    // Hoja: cadena vacía cae al valor por defecto (si existe)
    if (over === "" && base !== undefined && base !== "") return base;
    return over;
  }

  function withDefaults(saved) {
    return merge(window.TS_DEFAULTS, saved || {});
  }

  async function loadContent() {
    if (HAS_CLOUD) {
      try {
        const { data, error } = await sb.from(TABLE).select("content").eq("id", ROW_ID).maybeSingle();
        if (error) throw error;
        return withDefaults(data ? data.content : null);
      } catch (e) {
        console.warn("[store] No se pudo leer de Supabase, usando defaults:", e.message);
        return withDefaults(null);
      }
    }
    // Local
    try {
      const raw = localStorage.getItem(LS_KEY);
      return withDefaults(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return withDefaults(null);
    }
  }

  async function saveContent(content) {
    if (HAS_CLOUD) {
      const { error } = await sb.from(TABLE).upsert({ id: ROW_ID, content, updated_at: new Date().toISOString() });
      if (error) throw error;
      return;
    }
    localStorage.setItem(LS_KEY, JSON.stringify(content));
  }

  async function uploadImage(file) {
    if (HAS_CLOUD) {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `img/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }
    // Local: convertir a data URL (se guarda incrustado)
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  async function signIn(email, password) {
    if (!HAS_CLOUD) {
      // Modo local: login simulado (cualquier dato entra). El CRM real requiere Supabase.
      sessionStorage.setItem("ts_local_admin", "1");
      return { email: email || "local@admin" };
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async function signOut() {
    if (!HAS_CLOUD) {
      sessionStorage.removeItem("ts_local_admin");
      return;
    }
    await sb.auth.signOut();
  }

  // Crea un lead en el CRM (tabla deals) desde el formulario público
  async function addLead(lead) {
    if (!HAS_CLOUD) return; // sin Supabase no hay backend del CRM
    const row = {
      brand: lead.brand || lead.contact || "",
      contact: lead.contact || "",
      email: lead.email || "",
      phone: lead.phone || "",
      notes: lead.notes || "",
      stage: "nuevo",
      source: "web"
    };
    const { error } = await sb.from("deals").insert([row]);
    if (error) throw error;
  }

  async function getUser() {
    if (!HAS_CLOUD) {
      return sessionStorage.getItem("ts_local_admin") ? { email: "local@admin" } : null;
    }
    // getSession() lee la sesión guardada localmente (sin llamada al servidor):
    // así no se ve el login un instante al cargar cuando ya hay sesión iniciada.
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session.user : null;
  }

  window.TS_STORE = {
    isCloud: () => HAS_CLOUD,
    loadContent,
    saveContent,
    uploadImage,
    addLead,
    signIn,
    signOut,
    getUser
  };
})();
